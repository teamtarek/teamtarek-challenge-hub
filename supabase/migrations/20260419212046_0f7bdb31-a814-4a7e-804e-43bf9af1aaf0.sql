-- Drop dead/replaced functions
DROP FUNCTION IF EXISTS public.check_benchmark_cooldown_before_register() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Ensure no leftover triggers with same names
DROP TRIGGER IF EXISTS trg_check_benchmark_registration_allowed ON public.registrations;
DROP TRIGGER IF EXISTS trg_set_benchmark_deadline ON public.registrations;
DROP TRIGGER IF EXISTS trg_auto_link_registration_to_user ON public.registrations;
DROP TRIGGER IF EXISTS trg_create_comment_notification ON public.comments;
DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
DROP TRIGGER IF EXISTS trg_posts_updated_at ON public.posts;
DROP TRIGGER IF EXISTS trg_training_content_updated_at ON public.training_content;

-- registrations: BEFORE INSERT (order: auto-link first so user_id is available, then deadline + checks)
CREATE TRIGGER trg_auto_link_registration_to_user
BEFORE INSERT ON public.registrations
FOR EACH ROW
EXECUTE FUNCTION public.auto_link_registration_to_user();

CREATE TRIGGER trg_set_benchmark_deadline
BEFORE INSERT ON public.registrations
FOR EACH ROW
EXECUTE FUNCTION public.set_benchmark_deadline();

CREATE TRIGGER trg_check_benchmark_registration_allowed
BEFORE INSERT ON public.registrations
FOR EACH ROW
EXECUTE FUNCTION public.check_benchmark_registration_allowed();

-- comments: AFTER INSERT
CREATE TRIGGER trg_create_comment_notification
AFTER INSERT ON public.comments
FOR EACH ROW
EXECUTE FUNCTION public.create_comment_notification();

-- updated_at triggers
CREATE TRIGGER trg_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_posts_updated_at
BEFORE UPDATE ON public.posts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_training_content_updated_at
BEFORE UPDATE ON public.training_content
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();