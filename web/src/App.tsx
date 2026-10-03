import { BrowserRouter, Route, Routes } from "react-router";
import { AuthProvider } from "./auth/AuthContext.tsx";
import { Header } from "./components/Header.tsx";
import { RequireAuth } from "./components/RequireAuth.tsx";
import { EditRecipePage } from "./pages/EditRecipePage.tsx";
import { HomePage } from "./pages/HomePage.tsx";
import { LoginPage } from "./pages/LoginPage.tsx";
import { MyRecipesPage } from "./pages/MyRecipesPage.tsx";
import { NewRecipePage } from "./pages/NewRecipePage.tsx";
import { NotFoundPage } from "./pages/NotFoundPage.tsx";
import { RecipeDetailPage } from "./pages/RecipeDetailPage.tsx";
import { RegisterPage } from "./pages/RegisterPage.tsx";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="min-h-screen">
          <Header />
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/entrar" element={<LoginPage />} />
            <Route path="/cadastro" element={<RegisterPage />} />
            <Route path="/receitas/:id" element={<RecipeDetailPage />} />
            <Route
              path="/receitas/nova"
              element={
                <RequireAuth>
                  <NewRecipePage />
                </RequireAuth>
              }
            />
            <Route
              path="/receitas/:id/editar"
              element={
                <RequireAuth>
                  <EditRecipePage />
                </RequireAuth>
              }
            />
            <Route
              path="/minhas-receitas"
              element={
                <RequireAuth>
                  <MyRecipesPage />
                </RequireAuth>
              }
            />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}
