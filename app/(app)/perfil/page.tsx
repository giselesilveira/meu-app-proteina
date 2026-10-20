import { InstallHint } from "@/components/install-hint";
import { GoalsForm, NameForm, ProteinForm } from "@/components/profile-forms";
import { IconInfo, IconLogout, IconShield } from "@/components/icons";
import { Card, PageHeader } from "@/components/ui";
import { isAdminEmail, requireAccess } from "@/lib/access";
import { format } from "@/lib/nutrition";
import { publicConfig, supportHref, withBasePath } from "@/lib/public-config";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const metadata = { title: "Perfil" };

export default async function ProfilePage() {
  const access = await requireAccess();
  const n = access.nutrition!;
  const support = supportHref();

  return (
    <>
      <PageHeader title="Perfil" />

      <div className="space-y-5">
        <Card className="p-5">
          <h2 className="mb-4 text-lg font-bold">Seus dados</h2>
          <NameForm initialName={access.profile.full_name ?? ""} />
          <div className="mt-5">
            <p className="label">E-mail</p>
            <p className="rounded-xl bg-sand/50 px-4 py-3 font-semibold">{access.profile.email}</p>
            <p className="mt-1 text-sm text-mute">É o e-mail da sua compra. Para alterar, fale com o suporte.</p>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="mb-1 text-lg font-bold">Meta de proteína</h2>
          <p className="mb-4 text-mute">
            Meta atual: <strong className="tabular text-ink">{format.protein(n.protein_target_g)}</strong> por dia (
            {format.number1(n.weight_kg)} kg × {format.factor(n.protein_factor)}).
          </p>
          <ProteinForm weightKg={n.weight_kg} factor={n.protein_factor} />
        </Card>

        <Card className="p-5">
          <h2 className="mb-1 text-lg font-bold">Metas opcionais</h2>
          <p className="mb-4 text-mute">Preencha somente se a Nutri Gisele orientou. Deixe em branco para apenas acompanhar o consumo.</p>
          <GoalsForm calorieTarget={n.calorie_target} fatTargetG={n.fat_target_g} />
        </Card>

        <InstallHint />

        <Card className="divide-y divide-sand/80">
          {support ? (
            <a href={support} className="flex min-h-[60px] items-center gap-3 px-5 font-semibold hover:bg-sand/40" target="_blank" rel="noreferrer">
              <IconInfo className="text-copper" /> Ajuda e suporte
            </a>
          ) : null}
          {publicConfig.privacyPolicyUrl ? (
            <a href={publicConfig.privacyPolicyUrl} className="flex min-h-[60px] items-center gap-3 px-5 font-semibold hover:bg-sand/40" target="_blank" rel="noreferrer">
              <IconShield className="text-copper" /> Política de privacidade
            </a>
          ) : null}
          {publicConfig.termsUrl ? (
            <a href={publicConfig.termsUrl} className="flex min-h-[60px] items-center gap-3 px-5 font-semibold hover:bg-sand/40" target="_blank" rel="noreferrer">
              <IconShield className="text-copper" /> Termos de uso
            </a>
          ) : null}
          {isAdminEmail(access.user.email) ? (
            <Link href="/admin" className="flex min-h-[60px] items-center gap-3 px-5 font-semibold hover:bg-sand/40">
              <IconShield className="text-copper" /> Administração
            </Link>
          ) : null}
          <form action={withBasePath("/auth/sair")} method="post">
            <button type="submit" className="flex min-h-[60px] w-full items-center gap-3 px-5 text-left font-semibold text-danger hover:bg-sand/40">
              <IconLogout /> Sair
            </button>
          </form>
        </Card>

        <p className="text-center text-sm text-mute">
          Este aplicativo é exclusivo para alunas da Nutri Gisele Silveira. As informações nutricionais vêm da Tabela Brasileira de
          Composição de Alimentos (TACO/NEPA-UNICAMP) ou do rótulo do produto e não substituem a orientação profissional.
        </p>
      </div>
    </>
  );
}
