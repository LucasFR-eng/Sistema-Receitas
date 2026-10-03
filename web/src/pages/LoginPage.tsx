import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router";
import { useAuth } from "../auth/AuthContext.tsx";
import { AuthCard, FormError, SubmitButton } from "../components/AuthCard.tsx";
import { TextField } from "../components/TextField.tsx";
import { ApiError, type FieldErrors } from "../lib/api.ts";

export function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ login: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to="/" replace />;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});
    setSubmitting(true);

    try {
      await login(form.login, form.password);
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
    <AuthCard title="Entrar" subtitle="Que bom te ver de novo!">
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <FormError message={error} />
        <TextField
          label="E-mail ou usuário"
          name="login"
          autoComplete="username"
          value={form.login}
          onChange={(e) => setForm({ ...form, login: e.target.value })}
          error={fieldErrors.login?.[0]}
          required
        />
        <TextField
          label="Senha"
          name="password"
          type="password"
          autoComplete="current-password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          error={fieldErrors.password?.[0]}
          required
        />
        <SubmitButton loading={submitting}>Entrar</SubmitButton>
      </form>

      <p className="mt-6 text-center text-sm text-stone-600">
        Ainda não tem conta?{" "}
        <Link to="/cadastro" className="font-medium text-brand-700 hover:underline">
          Criar conta
        </Link>
      </p>
    </AuthCard>
  );
}
