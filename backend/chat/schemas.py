from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)


class Message(StrictModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=8000)

    @field_validator("content")
    @classmethod
    def trim_content(cls, value):
        value = value.strip()
        if not value:
            raise ValueError("Message cannot be blank")
        return value

    @model_validator(mode="after")
    def user_length(self):
        if self.role == "user" and len(self.content) > 2000:
            raise ValueError("User message exceeds 2000 characters")
        return self


class ChatRequest(StrictModel):
    messages: list[Message] = Field(min_length=1, max_length=19)

    @field_validator("messages")
    @classmethod
    def alternating_history(cls, messages):
        if len(messages) % 2 != 1:
            raise ValueError("History must end with a user message")
        for index, message in enumerate(messages):
            if message.role != ("user" if index % 2 == 0 else "assistant"):
                raise ValueError("History must alternate, starting with user")
        return messages


class Verification(StrictModel):
    status: Literal["accepted", "rejected"]
    reason: str | None = Field(default=None, min_length=1, max_length=500)

    @field_validator("reason")
    @classmethod
    def trim_reason(cls, value):
        if value is not None:
            value = value.strip()
            if not value:
                raise ValueError("Reason cannot be blank")
        return value

    @model_validator(mode="after")
    def rejection_reason(self):
        if self.status == "rejected" and self.reason is None:
            raise ValueError("Rejection requires a reason")
        return self


class ChatResponse(StrictModel):
    reply: str = Field(min_length=1, max_length=8000)
    verification: Verification
