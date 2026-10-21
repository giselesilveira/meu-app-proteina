import type { Metadata } from "next";
import { LegalPage, RESPONSIBLE, Section } from "@/components/legal-page";

export const dynamic = "force-static";
export const metadata: Metadata = {
  title: "Política de Privacidade",
  description: "Como o aplicativo Maratona 21 trata os seus dados pessoais.",
  robots: { index: true, follow: true },
};

// Texto alinhado ao que o aplicativo faz de fato (ver LEGAL_REVIEW.md antes de publicar).
export default function PrivacyPolicyPage() {
  const mail = (
    <a className="font-semibold text-ink underline underline-offset-4" href={`mailto:${RESPONSIBLE.email}`}>
      {RESPONSIBLE.email}
    </a>
  );
  return (
    <LegalPage
      title="Política de Privacidade"
      intro={
        <p>
          Esta Política explica como a <strong>{RESPONSIBLE.company}</strong> (CNPJ {RESPONSIBLE.cnpj}), que atua com o nome
          comercial <strong>{RESPONSIBLE.brand}</strong>, trata os dados pessoais de quem usa o aplicativo{" "}
          <strong>Maratona 21</strong>, de acordo com a Lei Geral de Proteção de Dados Pessoais (Lei nº 13.709/2018, “LGPD”).
        </p>
      }
    >
      <Section id="controladora" title="1. Quem é a responsável pelos seus dados">
        <p>
          A controladora dos dados é a {RESPONSIBLE.company}, CNPJ {RESPONSIBLE.cnpj} ({RESPONSIBLE.brand}). Para qualquer assunto
          relacionado a privacidade e aos seus dados, o canal de atendimento é {mail}.
        </p>
      </Section>

      <Section id="dados" title="2. Quais dados tratamos">
        <p>
          <strong>Dados de cadastro e acesso:</strong> e-mail usado na compra, nome que você informa no aplicativo e fuso horário
          (padrão: horário de Brasília).
        </p>
        <p>
          <strong>Dados recebidos da Hotmart, quando você compra:</strong> e-mail e nome da compradora, código de identificação da
          compradora na Hotmart, código da transação, produto e oferta adquiridos, situação da compra (aprovada, reembolsada,
          cancelada, contestada) e datas desses eventos. Ao registrar esses eventos, descartamos documento (CPF), endereço,
          telefone e códigos de pagamento.
        </p>
        <p>
          <strong>Dados que você registra no aplicativo:</strong>
        </p>
        <ul>
          <li>peso informado no primeiro acesso, fator de proteína escolhido e a meta diária calculada;</li>
          <li>metas opcionais de calorias e de gorduras, se você as preencher;</li>
          <li>alimentos consumidos: nome, quantidade em gramas, refeição (opcional), data e valores nutricionais calculados;</li>
          <li>alimentos favoritos;</li>
          <li>check-ins de evolução corporal: peso, cintura, abdômen e quadril, com a data de cada registro.</li>
        </ul>
        <p>
          <strong>Dados técnicos:</strong> cookies de sessão necessários para manter você conectada; registro interno de uso
          básico (entrada no app, conclusão do primeiro acesso, alimento adicionado, favorito adicionado e check-in registrado),
          sem conteúdo dos registros; e registros técnicos de funcionamento mantidos pelos provedores de hospedagem.
        </p>
        <p>
          Não usamos cookies de publicidade nem ferramentas de rastreamento de terceiros dentro do aplicativo.
        </p>
      </Section>

      <Section id="saude" title="3. Dados relacionados à saúde">
        <p>
          Peso, medidas corporais e registros alimentares podem revelar informações sobre a sua saúde e, por isso, são tratados
          como <strong>dados pessoais sensíveis</strong> (art. 5º, II, e art. 11 da LGPD). Eles são usados somente para o
          acompanhamento nutricional oferecido pelo aplicativo e não são vendidos, compartilhados para publicidade nem usados para
          decisões automatizadas sobre você.
        </p>
        <p>
          O aplicativo apresenta cálculos e o histórico dos seus registros. Ele não faz diagnóstico, prescrição nem avaliação
          clínica.
        </p>
      </Section>

      <Section id="finalidades" title="4. Para que usamos os dados e com qual base legal">
        <ul>
          <li>
            <strong>Liberar e controlar o seu acesso</strong> (compra, login, prazo, reembolso ou cancelamento): execução do
            contrato (art. 7º, V).
          </li>
          <li>
            <strong>Calcular a sua meta de proteína e mostrar consumo, histórico e evolução</strong>: execução do contrato (art.
            7º, V) e, para os dados de saúde, tutela da saúde em procedimento realizado por profissional de saúde e exercício
            regular de direitos em contrato (art. 11, II, “d” e “f”).
          </li>
          <li>
            <strong>Enviar o código de acesso e mensagens sobre o serviço</strong>: execução do contrato (art. 7º, V).
          </li>
          <li>
            <strong>Atender você no suporte e responder solicitações</strong>: execução do contrato e exercício regular de
            direitos (art. 7º, V e VI).
          </li>
          <li>
            <strong>Manter a segurança do aplicativo, prevenir fraudes e cumprir obrigações legais</strong> (por exemplo,
            registros fiscais e de compra): cumprimento de obrigação legal e legítimo interesse (art. 7º, II e IX).
          </li>
          <li>
            <strong>Entender o uso básico do aplicativo para melhorá-lo</strong>, com o registro interno descrito no item 2:
            legítimo interesse (art. 7º, IX).
          </li>
        </ul>
      </Section>

      <Section id="compartilhamento" title="5. Com quem os dados são compartilhados">
        <p>Utilizamos fornecedores que tratam dados em nosso nome, apenas para o funcionamento do serviço:</p>
        <ul>
          <li>
            <strong>Hotmart</strong>: plataforma de venda e pagamento. A compra é feita na Hotmart, que trata os seus dados de
            pagamento conforme a política de privacidade dela, e nos informa a situação da compra.
          </li>
          <li>
            <strong>Supabase</strong>: banco de dados e autenticação, onde ficam o seu cadastro e os seus registros.
          </li>
          <li>
            <strong>Vercel</strong>: hospedagem do aplicativo.
          </li>
          <li>
            <strong>Provedor de envio de e-mails</strong>: envio do código de acesso e de mensagens sobre o serviço.
          </li>
        </ul>
        <p>
          Alguns desses fornecedores podem processar dados fora do Brasil. Nesses casos, a transferência internacional é feita
          para a prestação do serviço contratado, nos termos do art. 33 da LGPD.
        </p>
        <p>
          A equipe autorizada da {RESPONSIBLE.brand} tem acesso administrativo restrito para liberar acessos, dar suporte e
          manter o catálogo de alimentos. Não vendemos nem alugamos dados pessoais. Dados podem ser informados a autoridades
          somente quando houver obrigação legal ou ordem judicial.
        </p>
      </Section>

      <Section id="seguranca" title="6. Como protegemos os dados">
        <ul>
          <li>acesso ao aplicativo sem senha, por código enviado ao e-mail da compra;</li>
          <li>conexão criptografada (HTTPS) em todas as páginas;</li>
          <li>
            controle de acesso no banco de dados: cada aluna só consegue ler e alterar os próprios registros, e apenas enquanto o
            acesso estiver ativo;
          </li>
          <li>área administrativa restrita a e-mails autorizados, com verificação no servidor e registro das ações;</li>
          <li>chaves de acesso ao banco guardadas somente no servidor;</li>
          <li>validação do token da Hotmart em cada notificação de compra recebida;</li>
          <li>descarte de dados de pagamento e de documentos que não são necessários ao serviço.</li>
        </ul>
        <p>
          Nenhum sistema é totalmente imune a falhas. Se ocorrer um incidente de segurança que possa trazer risco relevante, as
          titulares afetadas e a Autoridade Nacional de Proteção de Dados (ANPD) serão comunicadas, conforme o art. 48 da LGPD.
        </p>
      </Section>

      <Section id="conservacao" title="7. Por quanto tempo os dados são guardados">
        <p>
          Os seus registros ficam guardados enquanto a sua conta existir, inclusive depois do fim do prazo de acesso, de reembolso
          ou de cancelamento. Assim, se o acesso for reativado, o seu histórico continua disponível. Hoje não há exclusão
          automática: os dados são excluídos quando você solicita (item 9).
        </p>
        <p>
          Os registros da compra (e-mail, transação, produto e situação) podem ser mantidos mesmo após a exclusão da conta, pelo
          tempo necessário ao cumprimento de obrigações legais e ao exercício de direitos.
        </p>
      </Section>

      <Section id="direitos" title="8. Os seus direitos">
        <p>Conforme o art. 18 da LGPD, você pode solicitar, a qualquer momento:</p>
        <ul>
          <li>confirmação de que tratamos os seus dados e acesso a eles;</li>
          <li>correção de dados incompletos, inexatos ou desatualizados;</li>
          <li>anonimização, bloqueio ou eliminação de dados desnecessários ou tratados em desconformidade com a lei;</li>
          <li>portabilidade dos dados;</li>
          <li>eliminação dos dados tratados com base no seu consentimento, quando for o caso;</li>
          <li>informação sobre com quem os dados são compartilhados;</li>
          <li>revisão de decisões tomadas unicamente com base em tratamento automatizado;</li>
          <li>oposição a tratamento realizado em desconformidade com a lei.</li>
        </ul>
        <p>
          Você pode corrigir o seu nome, peso, metas e registros diretamente no aplicativo. O e-mail é o da compra e só é
          alterado pelo suporte. Você também pode apresentar reclamação à ANPD.
        </p>
      </Section>

      <Section id="exclusao" title="9. Como pedir a exclusão ou uma cópia dos seus dados">
        <p>
          Envie a solicitação para {mail}, a partir do e-mail cadastrado. Para proteger os seus dados, podemos pedir uma
          confirmação de identidade. A resposta será dada no prazo da LGPD (art. 19).
        </p>
        <p>
          Na exclusão da conta, são apagados o cadastro, os registros alimentares, os favoritos, as metas e os check-ins de
          evolução corporal. Ficam guardados apenas os registros de compra descritos no item 7. A exclusão encerra o acesso ao
          aplicativo.
        </p>
      </Section>

      <Section id="cookies" title="10. Cookies e armazenamento no aparelho">
        <p>
          Usamos apenas cookies essenciais para manter você conectada com segurança. Se você instalar o aplicativo na tela inicial,
          o aparelho guarda arquivos de visual e funcionamento para abrir mais rápido. Os seus dados pessoais não ficam guardados
          nesse armazenamento.
        </p>
      </Section>

      <Section id="menores" title="11. Público do aplicativo">
        <p>O Maratona 21 é destinado a pessoas maiores de 18 anos que adquiriram o programa.</p>
      </Section>

      <Section id="alteracoes" title="12. Alterações desta Política">
        <p>
          Esta Política pode ser atualizada. A data da última atualização aparece no topo da página. Mudanças relevantes serão
          comunicadas pelo aplicativo ou por e-mail.
        </p>
      </Section>

      <Section id="contato" title="13. Contato">
        <p>
          {RESPONSIBLE.company} · CNPJ {RESPONSIBLE.cnpj} · {RESPONSIBLE.brand}
          <br />
          E-mail para assuntos de privacidade e suporte: {mail}
        </p>
      </Section>
    </LegalPage>
  );
}
