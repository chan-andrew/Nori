import { Routes, Route } from "react-router-dom";
import Header from "./components/Header.jsx";
import Landing from "./pages/Landing.jsx";
import Query from "./pages/Query.jsx";
import Results from "./pages/Results.jsx";
import DishDetail from "./pages/DishDetail.jsx";
import SignIn from "./pages/SignIn.jsx";
import SignUp from "./pages/SignUp.jsx";
import Onboarding from "./pages/Onboarding.jsx";
import Profile from "./pages/Profile.jsx";

export default function App() {
  return (
    <div className="min-h-dvh bg-paper">
      <Header />
      <main className="mx-auto w-full max-w-3xl px-5 pb-24">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/order" element={<Query />} />
          <Route path="/results" element={<Results />} />
          <Route path="/dish/:id" element={<DishDetail />} />
          <Route path="/signin" element={<SignIn />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/profile" element={<Profile />} />
        </Routes>
      </main>
    </div>
  );
}
