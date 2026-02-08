import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Dumbbell, User, LogIn, Shield, MessageSquare } from "lucide-react";
import { NotificationBell } from "@/components/NotificationBell";

export const Header = () => {
  const { user, loading } = useAuth();
  const { isAdmin } = useUserRole();

  return (
    <header className="border-b border-border">
      <div className="container py-6">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <Dumbbell className="w-8 h-8 text-primary" />
            <span className="text-xl font-bold tracking-tight">Team Tarek</span>
          </Link>
          
          {!loading && (
            <div className="flex items-center gap-3">
              <Link to="/community">
                <Button variant="ghost" size="sm" className="gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Community
                </Button>
              </Link>
              {isAdmin && (
                <Link to="/admin">
                  <Button variant="outline" size="sm" className="gap-2">
                    <Shield className="w-4 h-4" />
                    Admin
                  </Button>
                </Link>
              )}
              {user ? (
                <>
                  <NotificationBell />
                  <Link to="/profil">
                    <Button variant="outline" size="sm" className="gap-2">
                      <User className="w-4 h-4" />
                      Profil
                    </Button>
                  </Link>
                </>
              ) : (
                <Link to="/auth">
                  <Button variant="outline" size="sm" className="gap-2">
                    <LogIn className="w-4 h-4" />
                    Anmelden
                  </Button>
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
