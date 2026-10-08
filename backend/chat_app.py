from fastapi import FastAPI

from chat.router import install_chat

app = FastAPI(title="czyPrzejadę – local accessibility chat")
install_chat(app)
