function AssistantQuickQuestions({ questions, onSelect, disabled = false }) {
  if (!questions.length) return null;
  return (
    <section className="assistant-quick" aria-label="Preguntas rápidas">
      <span>Preguntas rápidas</span>
      <div>
        {questions.map(({ id, question }) => (
          <button key={id} type="button" disabled={disabled} onClick={() => onSelect(question, id)}>{question}</button>
        ))}
      </div>
    </section>
  );
}

export default AssistantQuickQuestions;
