import { BrowserRouter, Route, Routes } from "react-router";
import { AuthProvider } from "./auth/AuthContext.tsx";
import { Header } from "./components/Header.tsx";
import { HomePage } from "./pages/HomePage.tsx";
import { LoginPage } from "./pages/LoginPage.tsx";
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
          </Routes>
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}
