import { BrowserRouter, Route, Routes } from "react-router";
import { AuthProvider } from "./auth/AuthContext.tsx";
import { Header } from "./components/Header.tsx";
import { RequireAuth } from "./components/RequireAuth.tsx";
import { EditProfilePage } from "./pages/EditProfilePage.tsx";
import { EditRecipePage } from "./pages/EditRecipePage.tsx";
import { FavoritesPage } from "./pages/FavoritesPage.tsx";
import { HomePage } from "./pages/HomePage.tsx";
import { LoginPage } from "./pages/LoginPage.tsx";
import { MyRecipesPage } from "./pages/MyRecipesPage.tsx";
import { NewRecipePage } from "./pages/NewRecipePage.tsx";
import { NotFoundPage } from "./pages/NotFoundPage.tsx";
import { ProfilePage } from "./pages/ProfilePage.tsx";
import { RecipeDetailPage } from "./pages/RecipeDetailPage.tsx";
import { RegisterPage } from "./pages/RegisterPage.tsx";
import { RemixRecipePage } from "./pages/RemixRecipePage.tsx";

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
              path="/receitas/:id/minha-versao"
              element={
                <RequireAuth>
                  <RemixRecipePage />
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
            <Route
              path="/salvas"
              element={
                <RequireAuth>
                  <FavoritesPage />
                </RequireAuth>
              }
            />
            <Route path="/perfil/:username" element={<ProfilePage />} />
            <Route
              path="/editar-perfil"
              element={
                <RequireAuth>
                  <EditProfilePage />
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
