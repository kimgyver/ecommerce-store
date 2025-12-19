"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface UserProfile {
  id: string;
  email: string;
  name: string;
  phone?: string;
  address?: string;
}

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // 폼 상태
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    address: ""
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  const [showPasswordForm, setShowPasswordForm] = useState(false);

  // 프로필 데이터 로드
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
      return;
    }

    if (status === "authenticated") {
      loadProfile();
    }
  }, [status]);

  const loadProfile = async () => {
    try {
      const response = await fetch("/api/user/profile");
      if (response.ok) {
        const data = await response.json();
        setUser(data);
        setFormData({
          name: data.name || "",
          phone: data.phone || "",
          address: data.address || ""
        });
      }
    } catch (err) {
      setError("프로필을 불러올 수 없습니다");
    } finally {
      setIsLoading(false);
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setIsSaving(true);

    try {
      const response = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok) {
        setUser(data.user);
        setSuccess("프로필이 업데이트되었습니다");
      } else {
        setError(data.error || "프로필 업데이트 실패");
      }
    } catch (err) {
      setError("프로필 업데이트 중 오류가 발생했습니다");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError("새 비밀번호가 일치하지 않습니다");
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setError("새 비밀번호는 최소 6자 이상이어야 합니다");
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        })
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess("비밀번호가 변경되었습니다");
        setPasswordData({
          currentPassword: "",
          newPassword: "",
          confirmPassword: ""
        });
        setShowPasswordForm(false);
      } else {
        setError(data.error || "비밀번호 변경 실패");
      }
    } catch (err) {
      setError("비밀번호 변경 중 오류가 발생했습니다");
    } finally {
      setIsSaving(false);
    }
  };

  if (status === "loading" || isLoading) {
    return <div className="text-center py-12">로딩 중...</div>;
  }

  if (status === "unauthenticated") {
    return null;
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow-md p-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">프로필</h1>
          <p className="text-gray-600 mt-2">안녕하세요, {user?.name}님!</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4">
            {success}
          </div>
        )}

        {/* 기본 프로필 정보 */}
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4">기본 정보</h2>
          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                이메일
              </label>
              <input
                type="email"
                value={user?.email || ""}
                disabled
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
              />
              <p className="text-xs text-gray-500 mt-1">
                이메일은 변경할 수 없습니다
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                이름
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={e =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                전화번호
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={e =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                placeholder="010-1234-5678"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                주소
              </label>
              <textarea
                value={formData.address}
                onChange={e =>
                  setFormData({ ...formData, address: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                placeholder="배송받을 주소를 입력해주세요"
                rows={3}
              />
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="w-full bg-blue-600 text-white py-2 rounded-lg font-bold hover:bg-blue-700 transition disabled:bg-gray-400"
            >
              {isSaving ? "저장 중..." : "저장"}
            </button>
          </form>
        </div>

        {/* 비밀번호 변경 */}
        <div className="border-t pt-8">
          <h2 className="text-xl font-bold mb-4">보안</h2>

          {!showPasswordForm ? (
            <button
              onClick={() => setShowPasswordForm(true)}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition"
            >
              비밀번호 변경
            </button>
          ) : (
            <form
              onSubmit={handlePasswordSubmit}
              className="space-y-4 max-w-md"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  현재 비밀번호
                </label>
                <input
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={e =>
                    setPasswordData({
                      ...passwordData,
                      currentPassword: e.target.value
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  새 비밀번호
                </label>
                <input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={e =>
                    setPasswordData({
                      ...passwordData,
                      newPassword: e.target.value
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  새 비밀번호 확인
                </label>
                <input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={e =>
                    setPasswordData({
                      ...passwordData,
                      confirmPassword: e.target.value
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  required
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-bold hover:bg-blue-700 transition disabled:bg-gray-400"
                >
                  {isSaving ? "변경 중..." : "비밀번호 변경"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowPasswordForm(false)}
                  className="flex-1 bg-gray-300 text-gray-800 py-2 rounded-lg font-bold hover:bg-gray-400 transition"
                >
                  취소
                </button>
              </div>
            </form>
          )}
        </div>

        {/* 네비게이션 */}
        <div className="border-t mt-8 pt-8">
          <Link
            href="/"
            className="text-blue-600 hover:text-blue-700 font-bold"
          >
            ← 홈으로 돌아가기
          </Link>
        </div>
      </div>
    </div>
  );
}
