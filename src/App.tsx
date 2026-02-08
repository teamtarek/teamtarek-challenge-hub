import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { AppLayout } from "@/components/AppLayout";
import LandingPage from "./pages/LandingPage";
import DashboardPage from "./pages/DashboardPage";
import ChallengesPage from "./pages/ChallengesPage";
import ChallengePage from "./pages/ChallengePage";
import AuthPage from "./pages/AuthPage";
import ProfilePage from "./pages/ProfilePage";
import PublicProfilePage from "./pages/PublicProfilePage";
import AdminPage from "./pages/AdminPage";
import CommunityPage from "./pages/CommunityPage";
import PostPage from "./pages/PostPage";
import LeaderboardPage from "./pages/LeaderboardPage";
import WorkoutClubPage from "./pages/WorkoutClubPage";
import FoundingCrewPage from "./pages/FoundingCrewPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/auth" element={<AuthPage />} />

            {/* Authenticated routes with AppLayout */}
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/community" element={<CommunityPage />} />
              <Route path="/community/:postId" element={<PostPage />} />
              <Route path="/challenges" element={<ChallengesPage />} />
              <Route path="/challenge/:slug" element={<ChallengePage />} />
              <Route path="/leaderboard" element={<LeaderboardPage />} />
              <Route path="/workout-club" element={<WorkoutClubPage />} />
              <Route path="/founding-crew" element={<FoundingCrewPage />} />
              <Route path="/profil" element={<ProfilePage />} />
              <Route path="/profil/:userId" element={<PublicProfilePage />} />
              <Route path="/admin" element={<AdminPage />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
