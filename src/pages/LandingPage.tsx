import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useCheckout } from "@/hooks/useCheckout";
import { Button } from "@/components/ui/button";
import { Footer } from "@/components/Footer";
import { Dumbbell, Users, Trophy, ArrowRight, Mountain, Heart, Flame } from "lucide-react";
import heroBg from "@/assets/hero-bg.jpg";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const LandingPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { startCheckout, loading: checkoutLoading } = useCheckout();

  useEffect(() => {
    if (user) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Minimal Public Header */}
      <header className="absolute top-0 left-0 right-0 z-50">
        <div className="container py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Dumbbell className="w-6 h-6 text-primary" />
              <span className="text-lg font-bold tracking-tight">Team Tarek</span>
            </div>
            <div className="flex items-center gap-3">
              <Link to="/auth">
                <Button variant="ghost" size="sm" className="text-foreground/80 hover:text-foreground">
                  Anmelden
                </Button>
              </Link>
              <Link to="/auth?tab=signup">
                <Button size="sm" className="gap-1">
                  Mitglied werden
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section
        className="relative min-h-screen flex items-center justify-center"
        style={{
          backgroundImage: `url(${heroBg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-background/75" />
        <div className="relative z-10 container text-center max-w-3xl py-32">
          <p className="text-primary uppercase tracking-[0.3em] text-sm font-medium mb-6">
            Outdoor Training Community
          </p>
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-black mb-8 leading-[0.9]">
            Raus. Bewegen.
            <br />
            Zusammen.
          </h1>
          <p className="text-lg md:text-xl text-foreground/70 max-w-xl mx-auto mb-10 leading-relaxed font-light">
            Team Tarek ist eine Community für alle, die sich draußen bewegen wollen.
            Echtes Training, echte Menschen, echte Ergebnisse.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/auth?tab=signup">
              <Button size="lg" className="text-base px-8 gap-2">
                Mitglied werden
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
            <Link to="/auth">
              <Button variant="outline" size="lg" className="text-base px-8">
                Anmelden
              </Button>
            </Link>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-5 h-8 border-2 border-foreground/30 rounded-full flex items-start justify-center p-1.5">
            <div className="w-0.5 h-1.5 bg-foreground/30 rounded-full" />
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="container py-24">
        <div className="max-w-4xl mx-auto">
          <p className="text-primary uppercase tracking-[0.2em] text-sm font-medium mb-4">
            Wofür wir stehen
          </p>
          <h2 className="text-3xl md:text-4xl font-bold mb-16">
            Bewegung. Einsatz. Freude. Zugehörigkeit.
          </h2>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="flex gap-4">
              <Mountain className="w-8 h-8 text-primary flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-lg font-semibold mb-2">Draußen trainieren</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Kein Studio, kein Schnickschnack. Wir trainieren draußen — bei jedem Wetter, in jeder Jahreszeit.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <Flame className="w-8 h-8 text-primary flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-lg font-semibold mb-2">Einsatz zeigen</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Es geht nicht um Perfektion. Es geht darum, anzufangen und dranzubleiben.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <Users className="w-8 h-8 text-primary flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-lg font-semibold mb-2">Gemeinsam stärker</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Die Community trägt dich. Challenges, Diskussionen und echte Verbindungen.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <Heart className="w-8 h-8 text-primary flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-lg font-semibold mb-2">Freude an Bewegung</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Training darf Spaß machen. Wir feiern den Prozess, nicht nur das Ergebnis.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Community Preview */}
      <section className="border-y border-border bg-card/50">
        <div className="container py-24">
          <div className="max-w-4xl mx-auto">
            <p className="text-primary uppercase tracking-[0.2em] text-sm font-medium mb-4">
              Community
            </p>
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Diskutieren. Teilen. Wachsen.
            </h2>
            <p className="text-muted-foreground text-lg mb-12 max-w-2xl">
              Im Forum tauschen sich Mitglieder über Training, Technik, Motivation und alles aus, was sie bewegt.
              Challenges verbinden — das Leaderboard motiviert.
            </p>

            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-card border border-border p-6">
                <Users className="w-6 h-6 text-primary mb-3" />
                <h3 className="font-semibold mb-1">Forum</h3>
                <p className="text-sm text-muted-foreground">Threads zu Training, Challenges & mehr</p>
              </div>
              <div className="bg-card border border-border p-6">
                <Trophy className="w-6 h-6 text-primary mb-3" />
                <h3 className="font-semibold mb-1">Leaderboard</h3>
                <p className="text-sm text-muted-foreground">Miss dich mit der Community</p>
              </div>
              <div className="bg-card border border-border p-6">
                <Dumbbell className="w-6 h-6 text-primary mb-3" />
                <h3 className="font-semibold mb-1">Challenges</h3>
                <p className="text-sm text-muted-foreground">Outdoor, Gym & Benchmark Workouts</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="container py-24">
        <div className="max-w-xl mx-auto text-center">
          <p className="text-primary uppercase tracking-[0.2em] text-sm font-medium mb-4">
            Mitgliedschaft
          </p>
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Werde Teil von Team Tarek
          </h2>
          <p className="text-muted-foreground mb-12">
            Voller Zugang zur Community, allen Challenges, dem Leaderboard und dem Workout Club.
          </p>

          <div className="bg-card border border-primary/30 p-8 md:p-10">
            <div className="text-5xl font-black mb-2">
              7,99 €
              <span className="text-lg font-normal text-muted-foreground"> / Monat</span>
            </div>
            <p className="text-muted-foreground mb-8">Monatlich kündbar. Keine Bindung.</p>

            <ul className="text-left space-y-3 mb-8 max-w-xs mx-auto">
              {[
                "Community Forum & Diskussionen",
                "Alle Challenges & Leaderboards",
                "Workout Club Inhalte",
                "Persönliches Profil & Statistiken",
              ].map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-sm">
                  <span className="text-primary mt-0.5">✓</span>
                  {feature}
                </li>
              ))}
            </ul>

            <Link to="/auth?tab=signup">
              <Button size="lg" className="w-full text-base">
                Jetzt starten
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default LandingPage;
