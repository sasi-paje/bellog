const BASE_STYLE = `
  body { margin: 0; padding: 0; background-color: #f3f4f6; font-family: Arial, sans-serif; }
  .wrapper { width: 100%; background-color: #f3f4f6; padding: 40px 0; }
  .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.08); }
  .header { background-color: #0f3255; padding: 32px 40px; text-align: center; }
  .header h1 { margin: 0; color: #ffffff; font-size: 24px; font-weight: 700; letter-spacing: -0.3px; }
  .header p { margin: 6px 0 0; color: #bdcde8; font-size: 14px; }
  .body { padding: 36px 40px; }
  .body p { margin: 0 0 16px; color: #374151; font-size: 15px; line-height: 1.6; }
  .cta-block { text-align: center; margin: 32px 0; }
  .button { display: inline-block; background-color: #0f3255; color: #ffffff !important; text-decoration: none; padding: 14px 36px; border-radius: 8px; font-size: 15px; font-weight: 700; letter-spacing: 0.2px; }
  .button:hover { background-color: #0a2440; }
  .info-box { background-color: #eef3fb; border-left: 4px solid #4077d9; border-radius: 4px; padding: 16px 20px; margin: 24px 0; }
  .info-box p { margin: 0; color: #1e3a5f; font-size: 14px; }
  .divider { border: none; border-top: 1px solid #e5e7eb; margin: 28px 0; }
  .note { color: #6b7280 !important; font-size: 13px !important; }
  .footer { background-color: #f9fafb; border-top: 1px solid #e5e7eb; padding: 24px 40px; text-align: center; }
  .footer p { margin: 0; color: #9ca3af; font-size: 12px; line-height: 1.6; }
  .footer a { color: #4077d9; text-decoration: none; }
`;

export function inviteEmailHtml(params: {
  fullName: string;
  recoveryLink: string;
}): string {
  const { fullName, recoveryLink } = params;
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Convite para acessar o Bellog</title>
  <style>${BASE_STYLE}</style>
</head>
<body>
<div class="wrapper">
  <div class="container">
    <div class="header">
      <h1>Bellog</h1>
      <p>Sistema de Gestão Logística</p>
    </div>
    <div class="body">
      <p>Olá, <strong>${fullName}</strong></p>
      <p>Você foi convidado para acessar o <strong>Bellog</strong>. Clique no botão abaixo para definir sua senha e ativar sua conta:</p>
      <div class="cta-block">
        <a href="${recoveryLink}" class="button">Definir Minha Senha</a>
      </div>
      <div class="info-box">
        <p>⏱ Este link é válido por <strong>1 hora</strong>. Após esse prazo, solicite um novo convite ao administrador.</p>
      </div>
      <hr class="divider">
      <p class="note">Se você não esperava este convite, pode ignorar este email com segurança. Nenhuma conta será criada sem que você clique no link acima.</p>
    </div>
    <div class="footer">
      <p>Atenciosamente,<br><strong>Equipe Bellog</strong></p>
      <p style="margin-top: 12px;">Este é um email automático. Não responda a esta mensagem.</p>
    </div>
  </div>
</div>
</body>
</html>`;
}

export function inviteEmailText(params: {
  fullName: string;
  recoveryLink: string;
}): string {
  const { fullName, recoveryLink } = params;
  return `Olá, ${fullName}

Você foi convidado para acessar o Bellog — Sistema de Gestão Logística.

Clique no link abaixo para definir sua senha:
${recoveryLink}

Este link é válido por 1 hora.

Se você não esperava este convite, ignore este email.

Atenciosamente,
Equipe Bellog`;
}

export function passwordResetEmailHtml(params: {
  recoveryLink: string;
}): string {
  const { recoveryLink } = params;
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Redefinir senha — Bellog</title>
  <style>${BASE_STYLE}</style>
</head>
<body>
<div class="wrapper">
  <div class="container">
    <div class="header">
      <h1>Bellog</h1>
      <p>Sistema de Gestão Logística</p>
    </div>
    <div class="body">
      <p>Olá,</p>
      <p>Recebemos uma solicitação para redefinir a senha da sua conta no <strong>Bellog</strong>. Clique no botão abaixo para criar uma nova senha:</p>
      <div class="cta-block">
        <a href="${recoveryLink}" class="button">Redefinir Minha Senha</a>
      </div>
      <div class="info-box">
        <p>⏱ Este link é válido por <strong>1 hora</strong> por motivos de segurança.</p>
      </div>
      <hr class="divider">
      <p class="note">Se você não solicitou a redefinição de senha, ignore este email. Sua senha atual permanece inalterada.</p>
      <p class="note">Se você continuar recebendo emails indesejados, entre em contato com o suporte.</p>
    </div>
    <div class="footer">
      <p>Atenciosamente,<br><strong>Equipe Bellog</strong></p>
      <p style="margin-top: 12px;">Este é um email automático. Não responda a esta mensagem.</p>
    </div>
  </div>
</div>
</body>
</html>`;
}

export function passwordResetEmailText(params: {
  recoveryLink: string;
}): string {
  const { recoveryLink } = params;
  return `Olá,

Recebemos uma solicitação para redefinir a senha da sua conta no Bellog.

Clique no link abaixo para criar uma nova senha:
${recoveryLink}

Este link é válido por 1 hora.

Se você não solicitou a redefinição, ignore este email.

Atenciosamente,
Equipe Bellog`;
}
