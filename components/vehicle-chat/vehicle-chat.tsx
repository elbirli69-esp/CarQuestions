"use client";

import { useState } from "react";
import { LoaderCircleIcon, SendIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { EXAMPLE_QUESTIONS } from "@/lib/vehicles/labels";
import type { AIAnswer, ChatMessage } from "@/types/ai";
import type { VehicleInput } from "@/types/vehicle";

export function VehicleChat({
  analysisId,
  vehicle,
  question,
  onQuestionChange,
}: {
  analysisId: string;
  vehicle: VehicleInput;
  question: string;
  onQuestionChange: (value: string) => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [lastAnswer, setLastAnswer] = useState<AIAnswer | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function ask(nextQuestion: string) {
    const trimmed = nextQuestion.trim();
    if (!trimmed || loading) return;
    setError(null);
    setLoading(true);
    onQuestionChange("");
    const history = [...messages, { role: "user" as const, content: trimmed }];
    setMessages(history);
    try {
      const response = await fetch("/api/vehicle/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: trimmed,
          analysisId,
          vehicle,
          history: messages,
        }),
      });
      const payload = (await response.json()) as { answer?: AIAnswer; error?: string };
      if (!response.ok || !payload.answer) {
        throw new Error(payload.error ?? "No se ha podido responder.");
      }
      setLastAnswer(payload.answer);
      setMessages([...history, { role: "assistant", content: payload.answer.text }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se ha podido responder.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pregunta lo que quieras sobre este coche</CardTitle>
        <CardDescription>
          El asistente usa el vehículo que has introducido, la valoración y los documentos recuperados. Si no hay un
          dato, lo dice.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-2">
          {EXAMPLE_QUESTIONS.map((item) => (
            <Button key={item} type="button" size="sm" variant="outline" onClick={() => void ask(item)}>
              {item}
            </Button>
          ))}
        </div>

        <div className="flex min-h-40 flex-col gap-3 rounded-xl bg-muted/40 p-4">
          {messages.length === 0 ? (
            <p className="text-sm text-muted-foreground">Todavía no hay preguntas. Empieza por un ejemplo o escribe la tuya.</p>
          ) : (
            messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={
                  message.role === "user"
                    ? "ml-auto max-w-[90%] rounded-2xl bg-primary px-3 py-2 text-sm text-primary-foreground"
                    : "max-w-[95%] whitespace-pre-wrap text-sm leading-6"
                }
              >
                {message.content}
              </div>
            ))
          )}
          {loading ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <LoaderCircleIcon className="size-4 animate-spin" /> Pensando...
            </p>
          ) : null}
        </div>

        {lastAnswer?.disclaimer ? (
          <p className="text-xs text-muted-foreground">
            {lastAnswer.disclaimer} · {lastAnswer.provider}
          </p>
        ) : null}

        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <form
          className="flex flex-col gap-2 sm:flex-row"
          onSubmit={(event) => {
            event.preventDefault();
            void ask(question);
          }}
        >
          <Textarea
            value={question}
            onChange={(event) => onQuestionChange(event.target.value)}
            placeholder="Escribe tu pregunta..."
            className="min-h-12 flex-1"
          />
          <Button type="submit" disabled={loading || !question.trim()} className="h-11 sm:self-end">
            <SendIcon />
            Preguntar
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
