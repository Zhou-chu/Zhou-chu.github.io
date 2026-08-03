"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";

export default function AdminLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("return_to") || "/admin";

  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!password.trim()) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password: password.trim() }),
      });

      if (res.ok) {
        router.push(returnTo);
      } else {
        const data = (await res.json()) as { error?: string };
        setError(data.error || "登录失败");
      }
    } catch {
      setError("网络错误，请重试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="admin-login">
      <form onSubmit={handleSubmit} className="admin-login__form">
        <h1>写作后台</h1>
        <p className="admin-login__hint">请输入管理密码</p>

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="密码"
          autoFocus
          autoComplete="current-password"
          className="admin-login__input"
          disabled={loading}
        />

        {error && <p className="admin-login__error">{error}</p>}

        <button
          type="submit"
          disabled={loading || !password.trim()}
          className="admin-login__button"
        >
          {loading ? "验证中…" : "进入后台"}
        </button>

        <a href="/" className="admin-login__back">← 返回首页</a>
      </form>
    </main>
  );
}
