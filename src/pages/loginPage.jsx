import { useEffect } from "react";
import { useForm } from "react-hook-form";
import {
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { LogIn } from "lucide-react";
import useAuth from "../hooks/useAuth";

const LoginPage = () => {
  const {
    login,
    loading,
    isAuthenticated,
    role,
  } = useAuth();

  const navigate = useNavigate();
  const location = useLocation();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  useEffect(() => {
    if (isAuthenticated) {
      navigate(
        role === "admin" ? "/admin" : "/dashboard",
        { replace: true }
      );
    }
  }, [isAuthenticated, role, navigate]);

  const onSubmit = async (formData) => {
    const result = await login(formData);

    if (!result.success) {
      return;
    }

    const requestedPage = location.state?.from?.pathname;

    if (result.user?.role === "admin") {
      navigate("/admin", { replace: true });
    } else {
      navigate(requestedPage || "/dashboard", {
        replace: true,
      });
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-white">
            Welcome Back
          </h1>

          <p className="mt-2 text-slate-400">
            Log in to continue watching with NextWatch.
          </p>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-5"
        >
          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-sm text-slate-300"
            >
              Email address
            </label>

            <input
              id="email"
              type="email"
              placeholder="you@example.com"
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none transition focus:border-red-600"
              {...register("email", {
                required: "Email is required.",
                pattern: {
                  value: /^\S+@\S+\.\S+$/,
                  message: "Enter a valid email address.",
                },
              })}
            />

            {errors.email && (
              <p className="mt-1 text-sm text-red-500">
                {errors.email.message}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm text-slate-300"
            >
              Password
            </label>

            <input
              id="password"
              type="password"
              placeholder="Enter your password"
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none transition focus:border-red-600"
              {...register("password", {
                required: "Password is required.",
                minLength: {
                  value: 6,
                  message:
                    "Password must have at least 6 characters.",
                },
              })}
            />

            {errors.password && (
              <p className="mt-1 text-sm text-red-500">
                {errors.password.message}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-3 font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <LogIn size={19} />

            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-400">
          Do not have an account?{" "}
          <Link
            to="/register"
            className="font-medium text-red-500 hover:text-red-400"
          >
            Create account
          </Link>
        </p>
      </div>
    </main>
  );
};

export default LoginPage;