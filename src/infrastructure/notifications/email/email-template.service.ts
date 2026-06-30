import { appConfig } from "../../../config/env.js";

type EmailVerificationTemplateInput = {
    username?: string;
    token: string;
    expiresAt?: string;
};

const createEmailVerificationUrl = (token: string) => {
    const baseUrl = appConfig.publicBaseUrl.replace(/\/+$/, "");
    return `${baseUrl}/api/v1/users/verify-email?token=${encodeURIComponent(token)}`;
};

const createEmailVerificationTemplate = ({
    username = "there",
    token,
    expiresAt,
}: EmailVerificationTemplateInput) => {
    const verificationUrl = createEmailVerificationUrl(token);
    const expiryText = expiresAt
        ? `This link expires at ${expiresAt}.`
        : "This link expires soon.";

    return {
        subject: "Verify your Streamly email address",
        text: [
            `Hi ${username},`,
            "",
            "Verify your Streamly email address using this link:",
            verificationUrl,
            "",
            expiryText,
            "If you did not create a Streamly account, ignore this email.",
        ].join("\n"),
        html: `
            <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827">
                <h1 style="margin:0 0 16px">Verify your Streamly email</h1>
                <p>Hi ${username},</p>
                <p>Confirm your email address to finish securing your Streamly account.</p>
                <p>
                    <a href="${verificationUrl}" style="display:inline-block;background:#111827;color:#ffffff;padding:12px 18px;border-radius:6px;text-decoration:none">
                        Verify email
                    </a>
                </p>
                <p>${expiryText}</p>
                <p style="color:#6b7280;font-size:13px">If you did not create a Streamly account, ignore this email.</p>
            </div>
        `,
    };
};

export { createEmailVerificationTemplate, createEmailVerificationUrl };
