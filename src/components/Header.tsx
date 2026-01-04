import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Dumbbell, User, LogIn } from "lucide-react";

export const Header = () => {
  const { user, loading } = useAuth();

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
              {user ? (
                <Link to="/profil">
                  <Button variant="outline" size="sm" className="gap-2">
                    <User className="w-4 h-4" />
                    Profil
                  </Button>
                </Link>
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
