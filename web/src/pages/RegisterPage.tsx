import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router";
import { useAuth, type RegisterData } from "../auth/AuthContext.tsx";
import { AuthCard, FormError, SubmitButton } from "../components/AuthCard.tsx";
import { TextField } from "../components/TextField.tsx";
import { ApiError, type FieldErrors } from "../lib/api.ts";

export function RegisterPage() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState<RegisterData>({ name: "", username: "", email: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to="/" replace />;

  function update(field: keyof RegisterData, value: string) {
    setForm({ ...form, [field]: value });
    // Limpa o erro do campo assim que o usuário começa a corrigir
    if (fieldErrors[field]) setFieldErrors({ ...fieldErrors, [field]: undefined });
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});
    setSubmitting(true);

    try {
      await register(form);
      navigate("/");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        setFieldErrors(err.fieldErrors);
      } else {
        setError("Algo deu errado. Tente novamente.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthCard title="Criar conta" subtitle="Guarde e compartilhe suas receitas.">
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <FormError message={error} />
        <TextField
          label="Nome"
          name="name"
          autoComplete="name"
          value={form.name}
          onChange={(e) => update("name", e.target.value)}
          error={fieldErrors.name?.[0]}
          required
        />
        <TextField
          label="Nome de usuário"
          name="username"
          autoComplete="username"
          placeholder="ex: maria_cozinha"
          value={form.username}
          onChange={(e) => update("username", e.target.value)}
          error={fieldErrors.username?.[0]}
          hint="Vai aparecer como @usuario nas suas receitas"
          required
        />
        <TextField
          label="E-mail"
          name="email"
          type="email"
          autoComplete="email"
          value={form.email}
          onChange={(e) => update("email", e.target.value)}
          error={fieldErrors.email?.[0]}
          required
        />
        <TextField
          label="Senha"
          name="password"
          type="password"
          autoComplete="new-password"
          value={form.password}
          onChange={(e) => update("password", e.target.value)}
          error={fieldErrors.password?.[0]}
          hint="Mínimo de 8 caracteres"
          required
        />
        <SubmitButton loading={submitting}>Criar conta</SubmitButton>
      </form>

      <p className="mt-6 text-center text-sm text-stone-600">
        Já tem conta?{" "}
        <Link to="/entrar" className="font-medium text-brand-700 hover:underline">
          Entrar
        </Link>
      </p>
    </AuthCard>
  );
}
