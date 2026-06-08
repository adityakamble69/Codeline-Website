// ============================================================
// CODELINE.AI — EmailTemplates.gs
// All outgoing HTML email templates (Professional English)
// ============================================================


// ── 1. Joining Form Confirmation (Applicant submits joining form) ──
function sendJoiningConfirmationEmail_(firstName, middleName, lastName, email, phone, position, duration, joiningDate,
college) {
const fullName = [firstName, middleName, lastName].filter(Boolean).join(" ");

const htmlBody = `
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1.0" />
</head>

<body style="margin:0;padding:0;background:#0d0d14;font-family:'Segoe UI',Arial,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0d14;padding:48px 16px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0"
                    style="background:#13131e;border-radius:16px;overflow:hidden;border:1px solid #1e1e2e;">

                    <tr>
                        <td style="background:#6b21a8;padding:40px 32px;text-align:center;">
                            <p
                                style="margin:0 0 8px;font-size:11px;color:rgba(255,255,255,0.65);letter-spacing:3px;text-transform:uppercase;">
                                ${INSTITUTE_NAME}</p>
                            <h1 style="margin:0;font-size:24px;font-weight:700;color:#ffffff;">Application Received</h1>
                            <p style="margin:10px 0 0;font-size:14px;color:rgba(255,255,255,0.70);">Internship Joining
                                Form — Confirmation</p>
                        </td>
                    </tr>

                    <tr>
                        <td style="padding:36px 36px 28px;color:#e2e2ef;">
                            <p style="margin:0 0 18px;font-size:16px;line-height:1.6;">
                                Dear <strong style="color:#a855f7;">${fullName}</strong>,
                            </p>
                            <p style="margin:0 0 14px;font-size:15px;color:#b0b0cc;line-height:1.75;">
                                Thank you for submitting your internship joining form at <strong
                                    style="color:#e2e2ef;">${INSTITUTE_NAME}</strong>.
                                We have successfully received your application and it is currently <strong
                                    style="color:#f0c040;">under review</strong>.
                            </p>
                            <p style="margin:0 0 28px;font-size:15px;color:#b0b0cc;line-height:1.75;">
                                Our team will carefully review your request and get back to you shortly.
                            </p>

                            <table width="100%" cellpadding="0" cellspacing="0"
                                style="background:#1b1b2a;border:1px solid #2a2a3e;border-radius:12px;margin-bottom:32px;">
                                <tr>
                                    <td style="padding:22px 26px;">
                                        <p
                                            style="margin:0 0 16px;font-size:11px;color:#6b6b88;text-transform:uppercase;letter-spacing:2px;font-weight:600;">
                                            Application Summary</p>
                                        <table width="100%" cellpadding="0" cellspacing="0"
                                            style="font-size:14px;line-height:1.6;">
                                            <tr>
                                                <td style="color:#6b6b88;padding:6px 0;width:44%;vertical-align:top;">
                                                    Full Name</td>
                                                <td style="color:#e2e2ef;font-weight:600;">${fullName}</td>
                                            </tr>
                                            <tr>
                                                <td style="color:#6b6b88;padding:6px 0;vertical-align:top;">Phone</td>
                                                <td style="color:#e2e2ef;font-weight:600;">${phone}</td>
                                            </tr>
                                            <tr>
                                                <td style="color:#6b6b88;padding:6px 0;vertical-align:top;">Applied For
                                                </td>
                                                <td style="color:#a855f7;font-weight:700;">${position}</td>
                                            </tr>
                                            <tr>
                                                <td style="color:#6b6b88;padding:6px 0;vertical-align:top;">College /
                                                    Institution</td>
                                                <td style="color:#e2e2ef;font-weight:600;">${college}</td>
                                            </tr>
                                            <tr>
                                                <td style="color:#6b6b88;padding:6px 0;vertical-align:top;">Duration
                                                </td>
                                                <td style="color:#e2e2ef;font-weight:600;">${duration}</td>
                                            </tr>
                                            <tr>
                                                <td style="color:#6b6b88;padding:6px 0;vertical-align:top;">Preferred
                                                    Joining Date</td>
                                                <td style="color:#e2e2ef;font-weight:600;">${joiningDate}</td>
                                            </tr>
                                            <tr>
                                                <td style="color:#6b6b88;padding:6px 0;vertical-align:top;">Status</td>
                                                <td>
                                                    <span style="background:#2a2200;color:#f0c040;font-size:12px;font-weight:700;
                             padding:3px 12px;border-radius:20px;border:1px solid #4a3c00;">
                                                        Pending Review
                                                    </span>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>

                            <p style="margin:0;font-size:14px;color:#b0b0cc;line-height:1.75;">
                                Warm regards,<br />
                                <strong style="color:#a855f7;">${INSTITUTE_NAME} Team</strong><br />
                                <span style="font-size:12px;color:#6b6b88;">Sharda Complex, Hingna Road, Nagpur,
                                    Maharashtra</span>
                            </p>
                        </td>
                    </tr>

                    <tr>
                        <td style="background:#0a0a10;padding:18px;text-align:center;border-top:1px solid #1e1e2e;">
                            <p style="margin:0;font-size:12px;color:#44445a;">&#169; 2026 ${INSTITUTE_NAME} &bull;
                                Nagpur, Maharashtra</p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>

</html>`;

sendEmail_(email, `${INSTITUTE_NAME} — Internship Application Received`, htmlBody);
}


// ── 2. Acceptance + Credentials (Joining application accepted, intern account created) ──
function buildCombinedAcceptanceEmail_(fullName, joiningDate, internId, batchName, duration) {
const loginUrl = "https://technocrat.asterisc.in/dashboard/";
const firstName = fullName.split(" ")[0];

const internBlock = internId ? `
<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
    <tr>
        <td style="background:#1b1b2a;border:1px solid #2a2a3e;border-radius:12px;padding:26px;">
            <p style="margin:0 0 18px;font-size:11px;color:#6b6b88;text-transform:uppercase;
                  letter-spacing:2px;font-weight:600;text-align:center;">Your Intern Credentials</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;line-height:1.6;">
                <tr>
                    <td style="color:#6b6b88;padding:7px 0;width:44%;">Intern ID</td>
                    <td style="color:#a855f7;font-weight:800;font-size:17px;letter-spacing:1px;">${internId}</td>
                </tr>
                <tr>
                    <td style="color:#6b6b88;padding:7px 0;">Batch</td>
                    <td style="color:#e2e2ef;font-weight:600;">${batchName || "—"}</td>
                </tr>
                <tr>
                    <td style="color:#6b6b88;padding:7px 0;">Duration</td>
                    <td style="color:#e2e2ef;font-weight:600;">${duration || "—"}</td>
                </tr>
            </table>
            <div style="text-align:center;margin-top:22px;">
                <a href="${loginUrl}" style="display:inline-block;background:#7c3aed;color:#ffffff;
                    padding:13px 34px;text-decoration:none;border-radius:10px;
                    font-weight:700;font-size:14px;letter-spacing:0.3px;">
                    Set Your Password
                </a>
            </div>
        </td>
    </tr>
</table>` : "";

return `
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1.0" />
</head>

<body style="margin:0;padding:0;background:#0d0d14;font-family:'Segoe UI',Arial,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0d14;padding:48px 16px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0"
                    style="background:#13131e;border-radius:16px;overflow:hidden;border:1px solid #1e1e2e;">

                    <tr>
                        <td style="background:#166534;padding:44px 32px;text-align:center;">
                            <p style="margin:0 0 10px;font-size:11px;color:rgba(255,255,255,0.70);
                letter-spacing:3px;text-transform:uppercase;">${INSTITUTE_NAME}</p>
                            <p style="margin:0 0 8px;font-size:38px;">&#127881;</p>
                            <h1 style="margin:0;font-size:28px;font-weight:800;color:#ffffff;">
                                Congratulations, ${firstName}!
                            </h1>
                            <p style="margin:12px 0 0;font-size:15px;color:rgba(255,255,255,0.80);font-weight:500;">
                                Your internship application has been <strong>accepted</strong>.
                            </p>
                        </td>
                    </tr>

                    <tr>
                        <td style="padding:36px 36px 28px;color:#e2e2ef;">
                            <p style="margin:0 0 20px;font-size:15px;color:#b0b0cc;line-height:1.75;">
                                Dear <strong style="color:#4ade80;">${fullName}</strong>,<br /><br />
                                We are thrilled to welcome you to <strong
                                    style="color:#e2e2ef;">${INSTITUTE_NAME}</strong>.
                                Your internship journey begins now — we are excited to have you on board.
                            </p>

                            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                                <tr>
                                    <td style="background:#14271e;border:1px solid #1d4030;
                     border-radius:12px;padding:22px 28px;text-align:center;">
                                        <p style="margin:0 0 6px;font-size:11px;color:#6b6b88;
                      text-transform:uppercase;letter-spacing:2px;font-weight:600;">Your Joining Date</p>
                                        <p
                                            style="margin:0;font-size:30px;font-weight:900;color:#4ade80;letter-spacing:1px;">
                                            ${joiningDate}
                                        </p>
                                        <p style="margin:8px 0 0;font-size:13px;color:#b0b0cc;">
                                            Please ensure you are available and prepared on this date.
                                        </p>
                                    </td>
                                </tr>
                            </table>

                            ${internBlock}

                            <p style="margin:0 0 28px;font-size:14px;color:#b0b0cc;line-height:1.75;">
                                For any queries, please reach us at
                                <a href="mailto:hr@asterisctechnocrat.com"
                                    style="color:#4ade80;text-decoration:none;font-weight:600;">
                                    hr@asterisctechnocrat.com
                                </a>
                            </p>

                            <p style="margin:0;font-size:14px;color:#b0b0cc;line-height:1.75;">
                                Warm regards,<br />
                                <strong style="color:#4ade80;">${INSTITUTE_NAME} Team</strong><br />
                                <span style="font-size:12px;color:#6b6b88;">Sharda Complex, Hingna Road, Nagpur,
                                    Maharashtra</span>
                            </p>
                        </td>
                    </tr>

                    <tr>
                        <td style="background:#0a0a10;padding:18px;text-align:center;border-top:1px solid #1e1e2e;">
                            <p style="margin:0;font-size:12px;color:#44445a;">&#169; 2026 ${INSTITUTE_NAME} &bull;
                                Nagpur, Maharashtra</p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>

</html>`;
}


// ── 3. Acceptance Only (no intern account — legacy / fallback) ──
function buildAcceptanceEmail_(fullName, joiningDate) {
return `
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1.0" />
</head>

<body style="margin:0;padding:0;background:#0d0d14;font-family:'Segoe UI',Arial,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0d14;padding:48px 16px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0"
                    style="background:#13131e;border-radius:16px;overflow:hidden;border:1px solid #1e1e2e;">

                    <tr>
                        <td style="background:#166534;padding:40px 32px;text-align:center;">
                            <p style="margin:0 0 6px;font-size:11px;color:rgba(255,255,255,0.65);
                letter-spacing:3px;text-transform:uppercase;">${INSTITUTE_NAME}</p>
                            <h1 style="margin:0;font-size:26px;font-weight:700;color:#ffffff;">Congratulations!</h1>
                            <p style="margin:10px 0 0;font-size:14px;color:rgba(255,255,255,0.80);">
                                Your internship application has been accepted.
                            </p>
                        </td>
                    </tr>

                    <tr>
                        <td style="padding:36px 36px 28px;color:#e2e2ef;">
                            <p style="margin:0 0 18px;font-size:16px;line-height:1.6;">
                                Dear <strong style="color:#4ade80;">${fullName}</strong>,
                            </p>
                            <p style="margin:0 0 20px;font-size:15px;color:#b0b0cc;line-height:1.75;">
                                We are pleased to inform you that your internship application at
                                <strong style="color:#e2e2ef;">${INSTITUTE_NAME}</strong> has been
                                <strong style="color:#4ade80;">officially accepted</strong>.
                                Welcome to the team — we look forward to working with you.
                            </p>

                            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                                <tr>
                                    <td style="background:#14271e;border:1px solid #1d4030;
                     border-radius:12px;padding:24px 28px;text-align:center;">
                                        <p style="margin:0 0 8px;font-size:11px;color:#6b6b88;
                      text-transform:uppercase;letter-spacing:2px;font-weight:600;">Your Joining Date</p>
                                        <p
                                            style="margin:0;font-size:28px;font-weight:900;color:#4ade80;letter-spacing:1px;">
                                            ${joiningDate}</p>
                                        <p style="margin:10px 0 0;font-size:13px;color:#b0b0cc;">
                                            Please ensure you are available and prepared on this date.
                                        </p>
                                    </td>
                                </tr>
                            </table>

                            <p style="margin:0 0 28px;font-size:14px;color:#b0b0cc;line-height:1.75;">
                                For any queries, contact us at
                                <a href="mailto:hr@asterisctechnocrat.com" style="color:#4ade80;text-decoration:none;">
                                    hr@asterisctechnocrat.com
                                </a>
                            </p>

                            <p style="margin:0;font-size:14px;color:#b0b0cc;line-height:1.75;">
                                Warm regards,<br />
                                <strong style="color:#4ade80;">${INSTITUTE_NAME} Team</strong>
                            </p>
                        </td>
                    </tr>

                    <tr>
                        <td style="background:#0a0a10;padding:18px;text-align:center;border-top:1px solid #1e1e2e;">
                            <p style="margin:0;font-size:12px;color:#44445a;">&#169; 2026 ${INSTITUTE_NAME} &bull;
                                Nagpur, Maharashtra</p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>

</html>`;
}


// ── 4. Rejection / Decline ──
function buildRejectionEmail_(fullName, reason) {
const reasonBlock = reason
? `<div style="background:#1c1010;border-left:4px solid #dc2626;border-radius:0 10px 10px 0;
                  padding:16px 20px;margin:20px 0;">
    <p style="margin:0 0 6px;font-size:11px;color:#6b6b88;text-transform:uppercase;
                    letter-spacing:1.5px;font-weight:600;">Reason for This Decision</p>
    <p style="margin:0;font-size:14px;color:#e2e2ef;line-height:1.75;">${reason}</p>
</div>`
: "";

return `
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1.0" />
</head>

<body style="margin:0;padding:0;background:#0d0d14;font-family:'Segoe UI',Arial,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0d14;padding:48px 16px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0"
                    style="background:#13131e;border-radius:16px;overflow:hidden;border:1px solid #1e1e2e;">

                    <tr>
                        <td style="background:#1a0e0e;padding:36px 32px;text-align:center;
               border-bottom:2px solid rgba(220,38,38,0.25);">
                            <p style="margin:0 0 6px;font-size:11px;color:rgba(255,255,255,0.50);
                letter-spacing:3px;text-transform:uppercase;">${INSTITUTE_NAME}</p>
                            <h1 style="margin:0;font-size:22px;font-weight:700;color:#ffffff;">Application Update</h1>
                        </td>
                    </tr>

                    <tr>
                        <td style="padding:36px 36px 28px;color:#e2e2ef;">
                            <p style="margin:0 0 18px;font-size:16px;line-height:1.6;">
                                Dear <strong style="color:#e2e2ef;">${fullName}</strong>,
                            </p>
                            <p style="margin:0 0 14px;font-size:15px;color:#b0b0cc;line-height:1.75;">
                                Thank you for your interest in interning with <strong
                                    style="color:#e2e2ef;">${INSTITUTE_NAME}</strong>.
                                After careful review of your application, we regret to inform you that we are
                                <strong style="color:#f87171;">unable to move forward</strong> with your application at
                                this time.
                            </p>
                            ${reasonBlock}
                            <p style="margin:0 0 28px;font-size:14px;color:#b0b0cc;line-height:1.75;">
                                We encourage you to <strong style="color:#e2e2ef;">reapply in the future</strong> as new
                                opportunities arise.
                                We appreciate the time you invested in this application.
                            </p>
                            <p style="margin:0;font-size:14px;color:#b0b0cc;line-height:1.75;">
                                Warm regards,<br />
                                <strong style="color:#a855f7;">${INSTITUTE_NAME} Team</strong>
                            </p>
                        </td>
                    </tr>

                    <tr>
                        <td style="background:#0a0a10;padding:18px;text-align:center;border-top:1px solid #1e1e2e;">
                            <p style="margin:0;font-size:12px;color:#44445a;">&#169; 2026 ${INSTITUTE_NAME} &bull;
                                Nagpur, Maharashtra</p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>

</html>`;
}


// ── 5. Welcome Email (manual intern creation / undo remove) ──
function buildManualWelcomeEmail_(name, internId, batchName, duration, loginUrl) {
return `
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1.0" />
</head>

<body style="margin:0;padding:0;background:#0d0d14;font-family:'Segoe UI',Arial,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0d14;padding:48px 16px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0"
                    style="background:#13131e;border-radius:16px;overflow:hidden;border:1px solid #1e1e2e;">

                    <tr>
                        <td style="background:#6b21a8;padding:44px 32px;text-align:center;">
                            <p style="margin:0 0 10px;font-size:11px;color:rgba(255,255,255,0.65);
                letter-spacing:3px;text-transform:uppercase;">${INSTITUTE_NAME}</p>
                            <p style="margin:0 0 8px;font-size:38px;">&#128640;</p>
                            <h1 style="margin:0;font-size:26px;font-weight:800;color:#ffffff;">
                                Welcome, ${name.split(" ")[0]}!
                            </h1>
                            <p style="margin:10px 0 0;font-size:14px;color:rgba(255,255,255,0.75);">
                                Your internship account has been successfully created.
                            </p>
                        </td>
                    </tr>

                    <tr>
                        <td style="padding:36px 36px 28px;color:#e2e2ef;">
                            <p style="margin:0 0 20px;font-size:15px;color:#b0b0cc;line-height:1.75;">
                                Dear <strong style="color:#a855f7;">${name}</strong>,<br /><br />
                                You have been officially added to the <strong
                                    style="color:#e2e2ef;">${INSTITUTE_NAME}</strong>
                                internship program. Below are your account details.
                            </p>

                            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                                <tr>
                                    <td style="background:#1b1b2a;border:1px solid #2a2a3e;
                     border-radius:12px;padding:24px 28px;">
                                        <p style="margin:0 0 16px;font-size:11px;color:#6b6b88;
                      text-transform:uppercase;letter-spacing:2px;font-weight:600;">
                                            Your Account Details
                                        </p>
                                        <table width="100%" cellpadding="0" cellspacing="0"
                                            style="font-size:14px;line-height:1.6;">
                                            <tr>
                                                <td style="color:#6b6b88;padding:8px 0;width:38%;">Intern ID</td>
                                                <td
                                                    style="color:#a855f7;font-weight:800;font-size:17px;letter-spacing:1px;">
                                                    ${internId}</td>
                                            </tr>
                                            <tr>
                                                <td style="color:#6b6b88;padding:8px 0;">Batch</td>
                                                <td style="color:#e2e2ef;font-weight:600;">${batchName}</td>
                                            </tr>
                                            <tr>
                                                <td style="color:#6b6b88;padding:8px 0;">Duration</td>
                                                <td style="color:#e2e2ef;font-weight:600;">${duration}</td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>

                            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                                <tr>
                                    <td style="text-align:center;padding:8px 0;">
                                        <a href="${loginUrl}" style="display:inline-block;background:#7c3aed;color:#ffffff;
                      padding:14px 38px;text-decoration:none;border-radius:10px;
                      font-weight:700;font-size:15px;letter-spacing:0.3px;">
                                            Set Your Password
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <p style="margin:0;font-size:14px;color:#b0b0cc;line-height:1.75;">
                                Warm regards,<br />
                                <strong style="color:#a855f7;">${INSTITUTE_NAME} Team</strong><br />
                                <span style="font-size:12px;color:#6b6b88;">Sharda Complex, Hingna Road, Nagpur,
                                    Maharashtra</span>
                            </p>
                        </td>
                    </tr>

                    <tr>
                        <td style="background:#0a0a10;padding:18px;text-align:center;border-top:1px solid #1e1e2e;">
                            <p style="margin:0;font-size:12px;color:#44445a;">&#169; 2026 ${INSTITUTE_NAME} &bull;
                                Nagpur, Maharashtra</p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>

</html>`;
}

// ── buildWelcomeEmail_ is an alias used by UndoRemoveIntern.gs ──
const buildWelcomeEmail_ = buildManualWelcomeEmail_;


// ── 6. Document Delivery ──
function buildDocLinkEmail_(name, docLinks, folderLink) {
const docRows = docLinks.map(d => `
<tr>
    <td style="padding:11px 0;border-bottom:1px solid #1e1e2e;">
        <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
                <td style="width:18px;vertical-align:middle;">
                    <span style="color:#a855f7;font-size:12px;font-weight:700;">&#9654;</span>
                </td>
                <td style="vertical-align:middle;padding-left:8px;">
                    <span style="color:#e2e2ef;font-size:14px;">${d.label}</span>
                </td>
                <td style="text-align:right;vertical-align:middle;">
                    <a href="${d.url}" style="display:inline-block;background:#7c3aed;color:#ffffff;
                        padding:6px 16px;text-decoration:none;border-radius:6px;
                        font-size:12px;font-weight:700;white-space:nowrap;">
                        View
                    </a>
                </td>
            </tr>
        </table>
    </td>
</tr>
`).join("");

return `
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1.0" />
</head>

<body style="margin:0;padding:0;background:#0d0d14;font-family:'Segoe UI',Arial,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0d14;padding:48px 16px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0"
                    style="background:#13131e;border-radius:16px;overflow:hidden;border:1px solid #1e1e2e;">

                    <tr>
                        <td style="background:#6b21a8;padding:36px 32px;text-align:center;">
                            <p style="margin:0 0 6px;font-size:11px;color:rgba(255,255,255,0.65);
                letter-spacing:3px;text-transform:uppercase;">${INSTITUTE_NAME}</p>
                            <h1 style="margin:0;font-size:24px;font-weight:700;color:#ffffff;">
                                Your Documents Are Ready
                            </h1>
                            <p style="margin:10px 0 0;font-size:13px;color:rgba(255,255,255,0.70);">
                                Official internship documents from ${INSTITUTE_NAME}
                            </p>
                        </td>
                    </tr>

                    <tr>
                        <td style="padding:36px 36px 28px;color:#e2e2ef;">
                            <p style="margin:0 0 22px;font-size:15px;color:#b0b0cc;line-height:1.75;">
                                Dear <strong style="color:#a855f7;">${name}</strong>,<br /><br />
                                Your official internship document(s) are now ready. Please click the
                                <strong style="color:#e2e2ef;">View</strong> button next to each document to open it.
                            </p>

                            <table width="100%" cellpadding="0" cellspacing="0" style="background:#1b1b2a;border:1px solid #2a2a3e;
                    border-radius:12px;padding:6px 20px;margin-bottom:28px;">
                                <tr>
                                    <td style="padding:14px 0 10px;">
                                        <p style="margin:0;font-size:11px;color:#6b6b88;text-transform:uppercase;
                      letter-spacing:2px;font-weight:600;">Documents Included</p>
                                    </td>
                                </tr>
                                ${docRows}
                                <tr>
                                    <td style="padding:4px 0;"></td>
                                </tr>
                            </table>

                            <p style="margin:0 0 28px;font-size:13px;color:#b0b0cc;line-height:1.75;">
                                These are official records of your internship at ${INSTITUTE_NAME}.
                                Please save copies for your future reference.<br /><br />
                                For any queries, contact us at
                                <a href="mailto:hr@asterisctechnocrat.com"
                                    style="color:#a855f7;text-decoration:none;">hr@asterisctechnocrat.com</a>
                            </p>

                            <p style="margin:0;font-size:14px;color:#b0b0cc;line-height:1.75;">
                                Warm regards,<br />
                                <strong style="color:#a855f7;">${INSTITUTE_NAME} Team</strong><br />
                                <span style="font-size:12px;color:#6b6b88;">Sharda Complex, Hingna Road, Nagpur,
                                    Maharashtra</span>
                            </p>
                        </td>
                    </tr>

                    <tr>
                        <td style="background:#0a0a10;padding:18px;text-align:center;border-top:1px solid #1e1e2e;">
                            <p style="margin:0;font-size:12px;color:#44445a;">
                                &#169; 2026 ${INSTITUTE_NAME} &bull; Nagpur, Maharashtra
                            </p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>

</html>`;
}


// ── 7. Task Review Result ──
function buildTaskReviewEmail_(name, finalStatus, grade, remarks) {
const statusColor = finalStatus === "Approved" ? "#4ade80" : "#f87171";
const statusBg = finalStatus === "Approved" ? "#14271e" : "#1c1010";
const statusBdr = finalStatus === "Approved" ? "#1d4030" : "#3a1a1a";

return `
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1.0" />
</head>

<body style="margin:0;padding:0;background:#0d0d14;font-family:'Segoe UI',Arial,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0d14;padding:48px 16px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0"
                    style="background:#13131e;border-radius:16px;overflow:hidden;border:1px solid #1e1e2e;">

                    <tr>
                        <td style="background:#6b21a8;padding:36px 32px;text-align:center;">
                            <p style="margin:0 0 6px;font-size:11px;color:rgba(255,255,255,0.65);
                letter-spacing:3px;text-transform:uppercase;">${INSTITUTE_NAME}</p>
                            <h1 style="margin:0;font-size:24px;font-weight:700;color:#ffffff;">Task Review Result</h1>
                        </td>
                    </tr>

                    <tr>
                        <td style="padding:36px 36px 28px;color:#e2e2ef;">
                            <p style="margin:0 0 18px;font-size:16px;line-height:1.6;">
                                Dear <strong style="color:#a855f7;">${name}</strong>,
                            </p>
                            <p style="margin:0 0 20px;font-size:15px;color:#b0b0cc;line-height:1.75;">
                                Your task submission has been reviewed. Please find the details below.
                            </p>

                            <table width="100%" cellpadding="0" cellspacing="0" style="background:${statusBg};border:1px solid ${statusBdr};
                    border-radius:12px;padding:20px 24px;margin-bottom:28px;">
                                <tr>
                                    <td>
                                        <table width="100%" cellpadding="0" cellspacing="0"
                                            style="font-size:14px;line-height:1.6;">
                                            <tr>
                                                <td style="color:#6b6b88;padding:7px 0;width:38%;">Status</td>
                                                <td style="color:${statusColor};font-weight:700;">${finalStatus}</td>
                                            </tr>
                                            <tr>
                                                <td style="color:#6b6b88;padding:7px 0;">Grade</td>
                                                <td style="color:#e2e2ef;font-weight:600;">${grade || "—"}</td>
                                            </tr>
                                            <tr>
                                                <td style="color:#6b6b88;padding:7px 0;">Remarks</td>
                                                <td style="color:#e2e2ef;">${remarks || "—"}</td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>

                            <p style="margin:0;font-size:14px;color:#b0b0cc;line-height:1.75;">
                                Warm regards,<br />
                                <strong style="color:#a855f7;">${INSTITUTE_NAME} Team</strong>
                            </p>
                        </td>
                    </tr>

                    <tr>
                        <td style="background:#0a0a10;padding:18px;text-align:center;border-top:1px solid #1e1e2e;">
                            <p style="margin:0;font-size:12px;color:#44445a;">&#169; 2026 ${INSTITUTE_NAME} &bull;
                                Nagpur, Maharashtra</p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>

</html>`;
}


// ── 8. Pending Task Reminder ──
function buildPendingTaskReminderEmail_(name, pendingCount) {
return `
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1.0" />
</head>

<body style="margin:0;padding:0;background:#0d0d14;font-family:'Segoe UI',Arial,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0d14;padding:48px 16px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0"
                    style="background:#13131e;border-radius:16px;overflow:hidden;border:1px solid #1e1e2e;">

                    <tr>
                        <td style="background:#6b21a8;padding:36px 32px;text-align:center;">
                            <p style="margin:0 0 6px;font-size:11px;color:rgba(255,255,255,0.65);
                letter-spacing:3px;text-transform:uppercase;">${INSTITUTE_NAME}</p>
                            <h1 style="margin:0;font-size:24px;font-weight:700;color:#ffffff;">Pending Task Reminder
                            </h1>
                        </td>
                    </tr>

                    <tr>
                        <td style="padding:36px 36px 28px;color:#e2e2ef;">
                            <p style="margin:0 0 18px;font-size:16px;line-height:1.6;">
                                Dear <strong style="color:#a855f7;">${name}</strong>,
                            </p>

                            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                                <tr>
                                    <td style="background:#1e1a08;border:1px solid #3a3000;border-radius:12px;
                     padding:22px 28px;text-align:center;">
                                        <p style="margin:0 0 6px;font-size:11px;color:#6b6b88;
                      text-transform:uppercase;letter-spacing:2px;font-weight:600;">Tasks Pending Today</p>
                                        <p style="margin:0;font-size:36px;font-weight:900;color:#facc15;">
                                            ${pendingCount}</p>
                                    </td>
                                </tr>
                            </table>

                            <p style="margin:0 0 20px;font-size:15px;color:#b0b0cc;line-height:1.75;">
                                You have <strong style="color:#e2e2ef;">${pendingCount} task${pendingCount > 1 ? "s" :
                                    ""}</strong>
                                due today that have not yet been submitted. Please log in to the portal and complete
                                your submissions at your earliest convenience.
                            </p>

                            <p style="margin:0;font-size:14px;color:#b0b0cc;line-height:1.75;">
                                Best regards,<br />
                                <strong style="color:#a855f7;">${INSTITUTE_NAME} Team</strong>
                            </p>
                        </td>
                    </tr>

                    <tr>
                        <td style="background:#0a0a10;padding:18px;text-align:center;border-top:1px solid #1e1e2e;">
                            <p style="margin:0;font-size:12px;color:#44445a;">&#169; 2026 ${INSTITUTE_NAME} &bull;
                                Nagpur, Maharashtra</p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>

</html>`;
}


// ── 9. Warning Notice ──
function buildWarningEmail_(name, warnMsg) {
return `
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1.0" />
</head>

<body style="margin:0;padding:0;background:#0d0d14;font-family:'Segoe UI',Arial,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0d14;padding:48px 16px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0"
                    style="background:#13131e;border-radius:16px;overflow:hidden;border:1px solid #1e1e2e;">

                    <tr>
                        <td style="background:#7f1d1d;padding:36px 32px;text-align:center;">
                            <p style="margin:0 0 6px;font-size:11px;color:rgba(255,255,255,0.60);
                letter-spacing:3px;text-transform:uppercase;">${INSTITUTE_NAME}</p>
                            <h1 style="margin:0;font-size:24px;font-weight:700;color:#ffffff;">Warning Notice</h1>
                        </td>
                    </tr>

                    <tr>
                        <td style="padding:36px 36px 28px;color:#e2e2ef;">
                            <p style="margin:0 0 18px;font-size:16px;line-height:1.6;">
                                Dear <strong style="color:#e2e2ef;">${name}</strong>,
                            </p>
                            <p style="margin:0 0 16px;font-size:15px;color:#b0b0cc;line-height:1.75;">
                                This notice is being issued to bring the following matter to your attention:
                            </p>

                            <div style="background:#1c1010;border-left:4px solid #dc2626;border-radius:0 10px 10px 0;
                  padding:16px 20px;margin:0 0 24px;">
                                <p style="margin:0;font-size:15px;color:#e2e2ef;line-height:1.75;">${warnMsg}</p>
                            </div>

                            <p style="margin:0 0 28px;font-size:14px;color:#b0b0cc;line-height:1.75;">
                                Please take this warning seriously and ensure full compliance going forward.
                                Continued violations may result in removal from the internship program.
                            </p>

                            <p style="margin:0;font-size:14px;color:#b0b0cc;line-height:1.75;">
                                Regards,<br />
                                <strong style="color:#a855f7;">${INSTITUTE_NAME} Admin</strong>
                            </p>
                        </td>
                    </tr>

                    <tr>
                        <td style="background:#0a0a10;padding:18px;text-align:center;border-top:1px solid #1e1e2e;">
                            <p style="margin:0;font-size:12px;color:#44445a;">&#169; 2026 ${INSTITUTE_NAME} &bull;
                                Nagpur, Maharashtra</p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>

</html>`;
}


// ── 10. Termination Notice ──
function buildTerminationEmail_(internName, reasonLabel) {
return `
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1.0" />
</head>

<body style="margin:0;padding:0;background:#0d0d14;font-family:'Segoe UI',Arial,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0d14;padding:48px 16px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0"
                    style="background:#13131e;border-radius:16px;overflow:hidden;border:1px solid #1e1e2e;">

                    <tr>
                        <td style="background:#450a0a;padding:36px 32px;text-align:center;
               border-bottom:2px solid rgba(220,38,38,0.30);">
                            <p style="margin:0 0 6px;font-size:11px;color:rgba(255,255,255,0.50);
                letter-spacing:3px;text-transform:uppercase;">${INSTITUTE_NAME}</p>
                            <h1 style="margin:0;font-size:22px;font-weight:700;color:#ffffff;">
                                Internship Termination Notice
                            </h1>
                        </td>
                    </tr>

                    <tr>
                        <td style="padding:36px 36px 28px;color:#e2e2ef;">
                            <p style="margin:0 0 18px;font-size:16px;line-height:1.6;">
                                Dear <strong style="color:#e2e2ef;">${internName}</strong>,
                            </p>
                            <p style="margin:0 0 16px;font-size:15px;color:#b0b0cc;line-height:1.75;">
                                We regret to inform you that your internship at <strong
                                    style="color:#e2e2ef;">${INSTITUTE_NAME}</strong>
                                has been terminated effective immediately.
                            </p>

                            <div style="background:#1c1010;border-left:4px solid #ef4444;border-radius:0 10px 10px 0;
                  padding:16px 20px;margin:0 0 24px;">
                                <p style="margin:0 0 4px;font-size:11px;color:#6b6b88;
                  text-transform:uppercase;letter-spacing:1.5px;font-weight:600;">Reason</p>
                                <p style="margin:0;font-size:14px;color:#e2e2ef;">${reasonLabel}</p>
                            </div>

                            <p style="margin:0 0 28px;font-size:14px;color:#b0b0cc;line-height:1.75;">
                                If you believe this decision was made in error, please contact us at
                                <a href="mailto:hr@asterisctechnocrat.com"
                                    style="color:#a855f7;text-decoration:none;">hr@asterisctechnocrat.com</a>
                                within 7 days.
                            </p>

                            <p style="margin:0;font-size:14px;color:#b0b0cc;line-height:1.75;">
                                Regards,<br />
                                <strong style="color:#a855f7;">${INSTITUTE_NAME} Admin</strong>
                            </p>
                        </td>
                    </tr>

                    <tr>
                        <td style="background:#0a0a10;padding:18px;text-align:center;border-top:1px solid #1e1e2e;">
                            <p style="margin:0;font-size:12px;color:#44445a;">&#169; 2026 ${INSTITUTE_NAME} &bull;
                                Nagpur, Maharashtra</p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>

</html>`;
}


// ── 11. Achievement Milestone ──
function buildAchievementEmail_(name, milestoneCount) {
return `
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1.0" />
</head>

<body style="margin:0;padding:0;background:#0d0d14;font-family:'Segoe UI',Arial,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0d14;padding:48px 16px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0"
                    style="background:#13131e;border-radius:16px;overflow:hidden;border:1px solid #1e1e2e;">

                    <tr>
                        <td style="background:#6b21a8;padding:44px 32px;text-align:center;">
                            <p style="margin:0 0 10px;font-size:11px;color:rgba(255,255,255,0.65);
                letter-spacing:3px;text-transform:uppercase;">${INSTITUTE_NAME}</p>
                            <p style="margin:0 0 8px;font-size:38px;">&#127942;</p>
                            <h1 style="margin:0;font-size:26px;font-weight:800;color:#ffffff;">Achievement Unlocked!
                            </h1>
                        </td>
                    </tr>

                    <tr>
                        <td style="padding:36px 36px 28px;color:#e2e2ef;">
                            <p style="margin:0 0 18px;font-size:16px;line-height:1.6;">
                                Dear <strong style="color:#a855f7;">${name}</strong>,
                            </p>

                            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                                <tr>
                                    <td style="background:#1b1b2a;border:1px solid #2a2a3e;border-radius:12px;
                     padding:24px 28px;text-align:center;">
                                        <p style="margin:0 0 6px;font-size:11px;color:#6b6b88;
                      text-transform:uppercase;letter-spacing:2px;font-weight:600;">Tasks Completed</p>
                                        <p style="margin:0;font-size:40px;font-weight:900;color:#a855f7;">
                                            ${milestoneCount}</p>
                                    </td>
                                </tr>
                            </table>

                            <p style="margin:0 0 20px;font-size:15px;color:#b0b0cc;line-height:1.75;">
                                Congratulations on completing <strong style="color:#e2e2ef;">${milestoneCount} approved
                                    tasks</strong>!
                                Your dedication and consistency are truly commendable. Keep up the great work!
                            </p>

                            <p style="margin:0;font-size:14px;color:#b0b0cc;line-height:1.75;">
                                Best regards,<br />
                                <strong style="color:#a855f7;">${INSTITUTE_NAME} Team</strong>
                            </p>
                        </td>
                    </tr>

                    <tr>
                        <td style="background:#0a0a10;padding:18px;text-align:center;border-top:1px solid #1e1e2e;">
                            <p style="margin:0;font-size:12px;color:#44445a;">&#169; 2026 ${INSTITUTE_NAME} &bull;
                                Nagpur, Maharashtra</p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>

</html>`;
}


// ── 12. Password Reset OTP ──
function buildOTPEmail_(name, otp, expiryMinutes) {
return `
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1.0" />
</head>

<body style="margin:0;padding:0;background:#0d0d14;font-family:'Segoe UI',Arial,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0d14;padding:48px 16px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0"
                    style="background:#13131e;border-radius:16px;overflow:hidden;border:1px solid #1e1e2e;">

                    <tr>
                        <td style="background:#6b21a8;padding:36px 32px;text-align:center;">
                            <p style="margin:0 0 6px;font-size:11px;color:rgba(255,255,255,0.65);
                letter-spacing:3px;text-transform:uppercase;">${INSTITUTE_NAME}</p>
                            <h1 style="margin:0;font-size:24px;font-weight:700;color:#ffffff;">Password Reset OTP</h1>
                        </td>
                    </tr>

                    <tr>
                        <td style="padding:36px 36px 28px;color:#e2e2ef;">
                            <p style="margin:0 0 18px;font-size:15px;line-height:1.6;">
                                Dear <strong style="color:#a855f7;">${name}</strong>,
                            </p>
                            <p style="margin:0 0 22px;font-size:15px;color:#b0b0cc;line-height:1.75;">
                                Use the one-time password below to reset your account password.
                                This OTP is valid for <strong style="color:#e2e2ef;">${expiryMinutes} minutes</strong>.
                            </p>

                            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                                <tr>
                                    <td style="background:#1b1b2a;border:1px solid #2a2a3e;border-radius:12px;
                     padding:26px;text-align:center;">
                                        <p style="margin:0;font-size:40px;font-weight:900;letter-spacing:12px;
                      color:#a855f7;font-variant-numeric:tabular-nums;">${otp}</p>
                                    </td>
                                </tr>
                            </table>

                            <p style="margin:0 0 28px;font-size:13px;color:#6b6b88;line-height:1.6;">
                                Do not share this OTP with anyone. If you did not request a password reset,
                                please ignore this email or contact us immediately.
                            </p>

                            <p style="margin:0;font-size:14px;color:#b0b0cc;line-height:1.75;">
                                Regards,<br />
                                <strong style="color:#a855f7;">${INSTITUTE_NAME} Team</strong>
                            </p>
                        </td>
                    </tr>

                    <tr>
                        <td style="background:#0a0a10;padding:18px;text-align:center;border-top:1px solid #1e1e2e;">
                            <p style="margin:0;font-size:12px;color:#44445a;">&#169; 2026 ${INSTITUTE_NAME} &bull;
                                Nagpur, Maharashtra</p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>

</html>`;
}


// ── 13. Admin Login Security Alert ──
function buildAdminLoginAlertEmail_(device) {
return `
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1.0" />
</head>

<body style="margin:0;padding:0;background:#0d0d14;font-family:'Segoe UI',Arial,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0d14;padding:48px 16px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0"
                    style="background:#13131e;border-radius:16px;overflow:hidden;border:1px solid #1e1e2e;">

                    <tr>
                        <td style="background:#1a0e0e;padding:36px 32px;text-align:center;
               border-bottom:2px solid rgba(220,38,38,0.25);">
                            <p style="margin:0 0 6px;font-size:11px;color:rgba(255,255,255,0.50);
                letter-spacing:3px;text-transform:uppercase;">${INSTITUTE_NAME}</p>
                            <h1 style="margin:0;font-size:24px;font-weight:700;color:#ffffff;">Admin Login Alert</h1>
                        </td>
                    </tr>

                    <tr>
                        <td style="padding:36px 36px 28px;color:#e2e2ef;">
                            <p style="margin:0 0 16px;font-size:15px;color:#b0b0cc;line-height:1.75;">
                                A new admin login has been detected on your account.
                            </p>

                            <table width="100%" cellpadding="0" cellspacing="0" style="background:#1b1b2a;border:1px solid #2a2a3e;border-radius:12px;
                    padding:18px 22px;margin-bottom:24px;">
                                <tr>
                                    <td>
                                        <table width="100%" cellpadding="0" cellspacing="0"
                                            style="font-size:14px;line-height:1.6;">
                                            <tr>
                                                <td style="color:#6b6b88;padding:7px 0;width:38%;">Device</td>
                                                <td style="color:#e2e2ef;font-weight:600;">${device || "Unknown"}</td>
                                            </tr>
                                            <tr>
                                                <td style="color:#6b6b88;padding:7px 0;">Time</td>
                                                <td style="color:#e2e2ef;font-weight:600;">${new Date().toUTCString()}
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>

                            <p style="margin:0 0 28px;font-size:14px;color:#f87171;line-height:1.75;">
                                <strong>If this was not you</strong>, please secure your account immediately by changing
                                your admin credentials.
                            </p>

                            <p style="margin:0;font-size:14px;color:#b0b0cc;line-height:1.75;">
                                Regards,<br />
                                <strong style="color:#a855f7;">${INSTITUTE_NAME} Security</strong>
                            </p>
                        </td>
                    </tr>

                    <tr>
                        <td style="background:#0a0a10;padding:18px;text-align:center;border-top:1px solid #1e1e2e;">
                            <p style="margin:0;font-size:12px;color:#44445a;">&#169; 2026 ${INSTITUTE_NAME} &bull;
                                Nagpur, Maharashtra</p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>

</html>`;
}

// ── 14. Task Assignment Notification ──
function buildTaskAssignedEmail_(name, taskTitle, taskDate, description) {
const descBlock = description
? `<div style="background:#1b1b2a;border-left:4px solid #7c3aed;border-radius:0 10px 10px 0;
                  padding:16px 20px;margin:20px 0;">
    <p style="margin:0 0 6px;font-size:11px;color:#6b6b88;text-transform:uppercase;
                    letter-spacing:1.5px;font-weight:600;">Task Description</p>
    <p style="margin:0;font-size:14px;color:#e2e2ef;line-height:1.75;">${description}</p>
</div>`
: "";

return `
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1.0" />
</head>

<body style="margin:0;padding:0;background:#0d0d14;font-family:'Segoe UI',Arial,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0d14;padding:48px 16px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0"
                    style="background:#13131e;border-radius:16px;overflow:hidden;border:1px solid #1e1e2e;">

                    <tr>
                        <td style="background:#6b21a8;padding:36px 32px;text-align:center;">
                            <p style="margin:0 0 6px;font-size:11px;color:rgba(255,255,255,0.65);
                letter-spacing:3px;text-transform:uppercase;">${INSTITUTE_NAME}</p>
                            <p style="margin:0 0 8px;font-size:32px;">📌</p>
                            <h1 style="margin:0;font-size:24px;font-weight:700;color:#ffffff;">New Task Assigned</h1>
                        </td>
                    </tr>

                    <tr>
                        <td style="padding:36px 36px 28px;color:#e2e2ef;">
                            <p style="margin:0 0 18px;font-size:16px;line-height:1.6;">
                                Dear <strong style="color:#a855f7;">${name}</strong>,
                            </p>
                            <p style="margin:0 0 20px;font-size:15px;color:#b0b0cc;line-height:1.75;">
                                A new task has been assigned to you. Please log in to the portal and submit your work
                                before the deadline.
                            </p>

                            <table width="100%" cellpadding="0" cellspacing="0" style="background:#1b1b2a;border:1px solid #2a2a3e;
                    border-radius:12px;padding:22px 26px;margin-bottom:20px;">
                                <tr>
                                    <td>
                                        <table width="100%" cellpadding="0" cellspacing="0"
                                            style="font-size:14px;line-height:1.6;">
                                            <tr>
                                                <td style="color:#6b6b88;padding:8px 0;width:38%;vertical-align:top;">
                                                    Task Title</td>
                                                <td style="color:#a855f7;font-weight:700;font-size:15px;">${taskTitle}
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="color:#6b6b88;padding:8px 0;vertical-align:top;">Due Date
                                                </td>
                                                <td style="color:#e2e2ef;font-weight:600;">${taskDate}</td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>

                            ${descBlock}

                            <p style="margin:24px 0 0;font-size:14px;color:#b0b0cc;line-height:1.75;">
                                Best regards,<br />
                                <strong style="color:#a855f7;">${INSTITUTE_NAME} Team</strong><br />
                                <span style="font-size:12px;color:#6b6b88;">Sharda Complex, Hingna Road, Nagpur,
                                    Maharashtra</span>
                            </p>
                        </td>
                    </tr>

                    <tr>
                        <td style="background:#0a0a10;padding:18px;text-align:center;border-top:1px solid #1e1e2e;">
                            <p style="margin:0;font-size:12px;color:#44445a;">&#169; 2026 ${INSTITUTE_NAME} &bull;
                                Nagpur, Maharashtra</p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>

</html>`;
}