import { redirect } from "next/navigation";
import { Onboarding } from "@/components/onboarding";
import { requireAccess } from "@/lib/access";

export const dynamic = "force-dynamic";
export const metadata = { title: "Bem-vinda" };

export default async function WelcomePage() {
  const access = await requireAccess({ allowIncompleteOnboarding: true });
  if (access.profile.onboarding_completed_at && access.nutrition) redirect("/");
  return <Onboarding initialName={access.profile.full_name ?? ""} />;
}
