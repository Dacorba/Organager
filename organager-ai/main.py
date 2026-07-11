from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Literal, Optional
import re
from datetime import date, timedelta

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

WorkspaceId = Literal["rovisys", "personal"]


class ContainerIn(BaseModel):
    id: str
    name: str


class AnalyzeRequest(BaseModel):
    workspaceId: WorkspaceId
    rawText: str
    containers: List[ContainerIn]


class AnalyzeResponse(BaseModel):
    title: str
    cleanedText: str
    category: str
    containerId: Optional[str]
    containerName: Optional[str]
    suggestedState: str
    confidence: float
    priority: str
    person: Optional[str]
    dateText: Optional[str]
    timeText: Optional[str]
    dateISO: Optional[str]


def normalize_text(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def short_title(text: str, limit: int = 70) -> str:
    text = normalize_text(text)
    return text if len(text) <= limit else text[:limit].rstrip() + "..."


def guess_container(text: str, containers: list[ContainerIn]) -> tuple[Optional[str], Optional[str], float]:
    lower = text.lower()

    for container in containers:
        if container.name.lower() in lower:
            return container.id, container.name, 0.96

    keyword_map = {
        "music": ["music", "beat", "loop", "sample", "drill", "melody", "mix", "master"],
        "business": ["business", "pricing", "price", "sale", "sales", "client", "website", "site", "offer"],
        "website": ["website", "site", "landing", "homepage", "frontend", "backend", "ui", "ux"],
    }

    for container in containers:
        name_lower = container.name.lower()
        if name_lower in keyword_map:
            if any(word in lower for word in keyword_map[name_lower]):
                return container.id, container.name, 0.82

    return None, None, 0.0


def classify_category(workspace_id: str, text: str) -> tuple[str, str, float]:
    lower = text.lower()

    if workspace_id == "rovisys":
        if any(x in lower for x in ["risco", "risk", "delay", "atraso", "escorrega", "impacta"]):
            return "Risk", "Novo", 0.88
        if any(x in lower for x in ["decision", "decisão", "avançar", "vamos fazer"]):
            return "Decision", "Novo", 0.86
        if any(x in lower for x in ["meeting", "reunião", "discutir", "alinhamento"]):
            return "Event", "Novo", 0.84
        if any(x in lower for x in ["follow", "follow-up", "confirmar", "rever", "amanhã"]):
            return "Follow-up", "Novo", 0.82
        if any(x in lower for x in ["nota", "note", "cliente", "preocupado"]):
            return "Note", "Novo", 0.78
        return "Task", "Novo", 0.35

    if any(x in lower for x in ["ideia", "idea", "talvez", "explorar"]):
        return "Idea", "Backlog", 0.86
    if any(x in lower for x in ["beat", "loop", "sample", "drill", "mix", "master", "music"]):
        return "Music", "Novo", 0.88
    if any(x in lower for x in ["pricing", "price", "sale", "sales", "business", "client", "website", "site"]):
        return "Business", "Novo", 0.84
    if any(x in lower for x in ["follow", "follow-up", "amanhã", "rever"]):
        return "Reminder", "Novo", 0.82
    return "Task", "Novo", 0.35

def extract_person(text: str) -> Optional[str]:
    match = re.search(r"\bcom\s+([A-ZÁÉÍÓÚÂÊÔÃÕÇ][\wÀ-ÿ-]+)", text)
    return match.group(1) if match else None


def extract_time(text: str) -> Optional[str]:
    lower = text.lower()
    clock_match = re.search(
        r"\b([01]?\d|2[0-3])(?::([0-5]\d)|h(?:([0-5]\d))?)\b",
        lower,
    )
    if clock_match:
        hour = int(clock_match.group(1))
        minute = clock_match.group(2) or clock_match.group(3) or "00"
        return f"{hour:02d}:{minute}"

    spoken_hour_match = re.search(r"\b(?:às|as)\s+([01]?\d|2[0-3])\b", lower)
    if spoken_hour_match:
        return f"{int(spoken_hour_match.group(1)):02d}:00"

    return None


def extract_date_text(text: str) -> Optional[str]:
    lower = text.lower()

    date_words = [
        "hoje",
        "amanhã",
        "segunda",
        "terça",
        "quarta",
        "quinta",
        "sexta",
        "sábado",
        "domingo",
        "próxima segunda",
        "próxima terça",
        "próxima quarta",
        "próxima quinta",
        "próxima sexta",
    ]

    for word in date_words:
        if word in lower:
            return word

    return None


def guess_priority(text: str, category: str) -> str:
    lower = text.lower()

    if any(x in lower for x in ["urgente", "crítico", "critico", "bloqueado", "parado"]):
        return "Alta"

    if category in ["Risk", "Issue"]:
        return "Alta"

    if any(x in lower for x in ["importante", "hoje", "amanhã", "amanha", "atraso"]):
        return "Alta"

    return "Baixa"

WEEKDAYS_PT = {
    "segunda": 0,
    "terça": 1,
    "terca": 1,
    "quarta": 2,
    "quinta": 3,
    "sexta": 4,
    "sábado": 5,
    "sabado": 5,
    "domingo": 6,
}

def extract_date_iso(text: str) -> Optional[str]:
    lower = text.lower()
    today = date.today()

    if any(x in lower for x in [
        "hoje",
        "agora",
        "esta tarde",
        "esta manhã",
        "esta manha",
        "logo"
    ]):
        return today.isoformat()

    if "amanhã" in lower or "amanha" in lower:
        return (today + timedelta(days=1)).isoformat()

    for word, target_weekday in WEEKDAYS_PT.items():
        if word in lower:
            days_ahead = target_weekday - today.weekday()

            if "próxima" in lower or "proxima" in lower:
                if days_ahead <= 0:
                    days_ahead += 7
            else:
                if days_ahead < 0:
                    days_ahead += 7

            return (today + timedelta(days=days_ahead)).isoformat()

    return None


@app.get("/health")
def health():
    return {"ok": True}


@app.post("/analyze-point", response_model=AnalyzeResponse)
def analyze_point(payload: AnalyzeRequest):
    cleaned = normalize_text(payload.rawText)
    category, suggested_state, category_conf = classify_category(payload.workspaceId, cleaned)
    container_id, container_name, container_conf = guess_container(cleaned, payload.containers)
    person = extract_person(cleaned)
    date_text = extract_date_text(cleaned)
    time_text = extract_time(cleaned)
    date_iso = extract_date_iso(cleaned)
    priority = guess_priority(cleaned, category)

    entity_conf = 0.72 if any([person, date_text, time_text, date_iso]) else 0.0
    priority_conf = 0.78 if priority == "Alta" else 0.0
    confidence = max(category_conf, container_conf, entity_conf, priority_conf)

    return AnalyzeResponse(
        title=short_title(cleaned),
        cleanedText=cleaned,
        category=category,
        containerId=container_id,
        containerName=container_name,
        suggestedState=suggested_state,
        confidence=round(confidence, 2),
        priority=priority,
        person=person,
        dateText=date_text,
        timeText=time_text,
        dateISO=date_iso,
    )
