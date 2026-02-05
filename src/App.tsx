 import { Toaster } from "@/components/ui/toaster";
 import { Toaster as Sonner } from "@/components/ui/sonner";
 import { TooltipProvider } from "@/components/ui/tooltip";
 import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
 import { BrowserRouter, Routes, Route } from "react-router-dom";
 import { AuthProvider } from "@/hooks/useAuth";
 import { MembershipProvider } from "@/hooks/useMembership";
 import Index from "./pages/Index";
 import ChallengePage from "./pages/ChallengePage";
 import AuthPage from "./pages/AuthPage";
 import ProfilePage from "./pages/ProfilePage";
 import PublicProfilePage from "./pages/PublicProfilePage";
 import AdminPage from "./pages/AdminPage";
 import CommunityPage from "./pages/CommunityPage";
 import PostPage from "./pages/PostPage";
 import PaywallPage from "./pages/PaywallPage";
 import NotFound from "./pages/NotFound";
 
 const queryClient = new QueryClient();
 
 const App = () => (
   <QueryClientProvider client={queryClient}>
     <TooltipProvider>
       <AuthProvider>
         <MembershipProvider>
           <Toaster />
           <Sonner />
           <BrowserRouter>
             <Routes>
               <Route path="/" element={<Index />} />
               <Route path="/challenge/:slug" element={<ChallengePage />} />
               <Route path="/auth" element={<AuthPage />} />
               <Route path="/profil" element={<ProfilePage />} />
               <Route path="/profil/:userId" element={<PublicProfilePage />} />
               <Route path="/admin" element={<AdminPage />} />
               <Route path="/community" element={<CommunityPage />} />
               <Route path="/community/:postId" element={<PostPage />} />
               <Route path="/paywall" element={<PaywallPage />} />
               <Route path="*" element={<NotFound />} />
             </Routes>
           </BrowserRouter>
         </MembershipProvider>
       </AuthProvider>
     </TooltipProvider>
   </QueryClientProvider>
 );
 
 export default App;
