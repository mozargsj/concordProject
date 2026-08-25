import { EmailMessage } from "cloudflare:email";
import { createMimeMessage } from "mimetext";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function corsHeaders(origin, env) {
  const allowed = env.ALLOWED_ORIGINS.split(",").map((o) => o.trim());
  const allowOrigin = allowed.includes(origin) ? origin : allowed[0];
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function jsonResponse(body, status, headers) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

async function githubRequest(env, path, options = {}) {
  const url = `https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/${path}`;
  return fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${env.GITHUB_TOKEN}`,
      "User-Agent": "concord-alpha-form-worker",
      Accept: "application/vnd.github+json",
      ...(options.headers || {}),
    },
  });
}

async function saveSignup(env, email) {
  const contentsPath = `contents/${env.GITHUB_FILE_PATH}?ref=${env.GITHUB_BRANCH}`;
  const getResponse = await githubRequest(env, contentsPath);

  let signups = [];
  let sha;

  if (getResponse.status === 200) {
    const file = await getResponse.json();
    sha = file.sha;
    signups = JSON.parse(atob(file.content));
  } else if (getResponse.status !== 404) {
    throw new Error(`GitHub GET falhou: ${getResponse.status}`);
  }

  if (signups.some((entry) => entry.email === email)) {
    return { duplicate: true };
  }

  signups.push({ email, date: new Date().toISOString() });

  const putResponse = await githubRequest(env, `contents/${env.GITHUB_FILE_PATH}`, {
    method: "PUT",
    body: JSON.stringify({
      message: `chore: nova inscrição alpha (${email})`,
      content: btoa(JSON.stringify(signups, null, 2) + "\n"),
      branch: env.GITHUB_BRANCH,
      ...(sha ? { sha } : {}),
    }),
  });

  if (!putResponse.ok) {
    throw new Error(`GitHub PUT falhou: ${putResponse.status}`);
  }

  return { duplicate: false };
}

async function notifyByEmail(env, email) {
  const msg = createMimeMessage();
  msg.setSender({ addr: env.FROM_ADDRESS, name: "Concord Alpha" });
  msg.setRecipient(env.SEND_EMAIL.destination_address ?? "mozargsj@gmail.com");
  msg.setSubject("Nova inscrição na fase alpha do Concord");
  msg.addMessage({
    contentType: "text/plain",
    data: `Novo interessado na alpha: ${email}\nData: ${new Date().toISOString()}`,
  });

  const message = new EmailMessage(env.FROM_ADDRESS, "mozargsj@gmail.com", msg.asRaw());
  await env.SEND_EMAIL.send(message);
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const headers = corsHeaders(origin, env);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers });
    }

    if (request.method !== "POST") {
      return jsonResponse({ error: "method not allowed" }, 405, headers);
    }

    let email;
    try {
      const body = await request.json();
      email = String(body.email || "").trim().toLowerCase();
    } catch {
      return jsonResponse({ error: "invalid body" }, 400, headers);
    }

    if (!EMAIL_RE.test(email)) {
      return jsonResponse({ error: "invalid email" }, 400, headers);
    }

    try {
      const { duplicate } = await saveSignup(env, email);
      if (!duplicate) {
        await notifyByEmail(env, email);
      }
      return jsonResponse({ ok: true, duplicate }, 200, headers);
    } catch (err) {
      console.error(err);
      return jsonResponse({ error: "internal error" }, 500, headers);
    }
  },
};
