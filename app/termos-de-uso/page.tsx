import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, RESPONSIBLE, Section } from "@/components/legal-page";

export const dynamic = "force-static";
export const metadata: Metadata = {
  title: "Termos de Uso",
  description: "Condições de uso do aplicativo Maratona 21.",
  robots: { index: true, follow: true },
};

// Texto alinhado ao que o aplicativo faz de fato (ver LEGAL_REVIEW.md antes de publicar).
export default function TermsPage() {
  const mail = (
    <a className="font-semibold text-ink underline underline-offset-4" href={`mailto:${RESPONSIBLE.email}`}>
      {RESPONSIBLE.email}
    </a>
  );
  return (
    <LegalPage
      title="Termos de Uso"
      intro={
        <p>
          Estes Termos regulam o uso do aplicativo <strong>Maratona 21</strong>, oferecido pela{" "}
          <strong>{RESPONSIBLE.company}</strong> (CNPJ {RESPONSIBLE.cnpj}), nome comercial <strong>{RESPONSIBLE.brand}</strong>,
          às alunas que adquiriram o programa. Ao entrar no aplicativo, você declara que leu e concorda com estes Termos e com a{" "}
          <Link href="/politica-de-privacidade" className="font-semibold text-ink underline underline-offset-4">
            Política de Privacidade
          </Link>
          .
        </p>
      }
    >
      <Section id="servico" title="1. O que é o aplicativo">
        <p>
          O Maratona 21 é uma ferramenta de apoio ao acompanhamento nutricional. Ele permite definir a meta diária de proteína,
          registrar alimentos consumidos, consultar o histórico e acompanhar a evolução de peso e medidas corporais.
        </p>
      </Section>

      <Section id="acesso" title="2. Acesso">
        <ul>
          <li>O acesso é liberado mediante compra do programa na plataforma Hotmart.</li>
          <li>
            O login é feito com o <strong>mesmo e-mail informado na compra</strong>, por meio de um código enviado a esse
            e-mail. Mantenha o seu e-mail seguro, porque quem tiver acesso a ele poderá entrar no aplicativo.
          </li>
          <li>
            A liberação depende da confirmação da compra pela Hotmart e normalmente ocorre em poucos minutos após a aprovação do
            pagamento.
          </li>
        </ul>
      </Section>

      <Section id="prazo" title="3. Prazo de acesso">
        <p>
          O acesso ao aplicativo é válido por <strong>6 (seis) meses a partir da confirmação da compra</strong>. Ao fim desse
          prazo, o acesso é encerrado. Os seus registros ficam guardados conforme a Política de Privacidade e voltam a ficar
          disponíveis se houver nova contratação.
        </p>
      </Section>

      <Section id="individual" title="4. Uso individual">
        <p>
          O acesso é <strong>pessoal e intransferível</strong>. Não é permitido compartilhar o acesso, o código de login ou o
          conteúdo do aplicativo com outras pessoas, nem revendê-lo. O uso indevido pode levar à suspensão do acesso, após
          comunicação pelo e-mail cadastrado.
        </p>
      </Section>

      <Section id="estimativas" title="5. Limitações das informações nutricionais">
        <ul>
          <li>
            Os valores nutricionais vêm principalmente da Tabela Brasileira de Composição de Alimentos (TACO), da Universidade
            Estadual de Campinas (NEPA/UNICAMP), ou do rótulo do produto. São <strong>valores de referência</strong>: a composição
            real de um alimento pode variar conforme marca, safra, corte, preparo e porção.
          </li>
          <li>
            Os cálculos dependem das quantidades informadas por você. Quantidades estimadas ou registradas de forma incorreta
            alteram os resultados.
          </li>
          <li>
            O fator usado na meta de proteína deve ser o indicado pela Nutri Gisele. O aplicativo não recomenda fator nem meta.
          </li>
          <li>
            O aplicativo <strong>não faz diagnóstico, prescrição ou avaliação clínica</strong> e não substitui consulta com
            profissional de saúde. Em caso de doença, gestação, uso de medicamentos ou qualquer dúvida sobre a sua saúde, procure
            acompanhamento profissional individual.
          </li>
        </ul>
      </Section>

      <Section id="resultados" title="6. Resultados">
        <p>
          O aplicativo é uma ferramenta de organização e acompanhamento. <strong>Não há garantia de emagrecimento</strong> ou de
          qualquer resultado específico: os resultados variam de pessoa para pessoa e dependem de fatores como hábitos, condições
          de saúde e adesão às orientações.
        </p>
      </Section>

      <Section id="cancelamento" title="7. Cancelamento e reembolso">
        <ul>
          <li>
            Nas compras feitas pela internet, você pode desistir em até <strong>7 (sete) dias</strong> contados da compra, com
            devolução integral do valor pago, conforme o art. 49 do Código de Defesa do Consumidor.
          </li>
          <li>
            O pedido de reembolso é feito pela Hotmart, conforme o prazo de garantia informado na página de compra, ou pelo
            e-mail {mail}.
          </li>
          <li>
            Quando a Hotmart confirma o reembolso, o cancelamento ou uma contestação de pagamento (chargeback), o acesso ao
            aplicativo é encerrado automaticamente. Os seus registros ficam guardados conforme a Política de Privacidade e podem
            ser excluídos a seu pedido.
          </li>
        </ul>
      </Section>

      <Section id="responsabilidades" title="8. Responsabilidades">
        <p>
          <strong>Da {RESPONSIBLE.brand}:</strong> manter o aplicativo funcionando com cuidado e segurança, proteger os seus dados
          conforme a Política de Privacidade e prestar suporte pelo e-mail {mail}. O aplicativo pode ficar indisponível por
          períodos curtos para manutenção, atualizações ou por falhas de fornecedores de internet e hospedagem. Nesses casos,
          trabalharemos para restabelecer o serviço o quanto antes.
        </p>
        <p>
          <strong>Da usuária:</strong> informar dados verdadeiros, manter o acesso ao e-mail da compra em segurança, usar o
          aplicativo de forma pessoal e conforme estes Termos, e seguir as orientações profissionais recebidas.
        </p>
        <p>Nada nestes Termos limita os direitos garantidos pelo Código de Defesa do Consumidor.</p>
      </Section>

      <Section id="propriedade" title="9. Propriedade intelectual">
        <p>
          A marca {RESPONSIBLE.brand}, o nome Maratona 21, os textos, o visual, o código e os demais conteúdos do aplicativo
          pertencem à {RESPONSIBLE.company} ou são usados com autorização. É proibido copiar, reproduzir, distribuir ou criar obras
          derivadas sem autorização por escrito. A Tabela TACO é uma publicação do NEPA/UNICAMP e é citada como fonte.
        </p>
      </Section>

      <Section id="alteracoes" title="10. Alterações dos Termos">
        <p>
          Estes Termos podem ser atualizados. A data da última atualização aparece no topo da página. Mudanças relevantes serão
          comunicadas pelo aplicativo ou por e-mail.
        </p>
      </Section>

      <Section id="lei" title="11. Lei aplicável e foro">
        <p>
          Estes Termos seguem as leis brasileiras, em especial o Código de Defesa do Consumidor e a LGPD. Eventuais conflitos
          podem ser resolvidos no foro do domicílio da consumidora.
        </p>
      </Section>

      <Section id="contato" title="12. Contato">
        <p>
          {RESPONSIBLE.company} · CNPJ {RESPONSIBLE.cnpj} · {RESPONSIBLE.brand}
          <br />
          Suporte: {mail}
        </p>
      </Section>
    </LegalPage>
  );
}
