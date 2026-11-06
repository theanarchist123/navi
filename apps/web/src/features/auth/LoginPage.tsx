import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { loginRequestSchema, type LoginRequest } from "@opshub/contracts";
import { Button, TextField } from "../../components/ui";
import { toRequestError } from "../../lib/api";
import { useSession } from "../../stores/session";
import { useState } from "react";
import { ArrowRight, Check, ClipboardCheck, Eye, EyeOff, KeyRound, PackageCheck, ShieldCheck, Truck, Wrench } from "lucide-react";

const demoPersonas = [
  {
    id: "platform-admin",
    label: "Platform Admin",
    email: "admin@opshub.local",
    scope: ["Global Fleet", "Site Genesis", "Trust Console", "Visual Builder"],
    icon: ShieldCheck,
  },
  {
    id: "storekeeper",
    label: "Storekeeper",
    email: "storekeeper@opshub.local",
    scope: ["Central Stores", "Stock Intake", "Optical Scanning", "Ledgers"],
    icon: PackageCheck,
  },
  {
    id: "technician",
    label: "Technician",
    email: "technician@opshub.local",
    scope: ["Service Centre", "PCB Repairs", "Return Restocking"],
    icon: Wrench,
  },
  {
    id: "approver",
    label: "Approver",
    email: "approver@opshub.local",
    scope: ["Workflow Approvals", "SLA Breaches", "Dispatch Releases"],
    icon: ClipboardCheck,
  },
  {
    id: "dispatcher",
    label: "Dispatcher",
    email: "dispatcher@opshub.local",
    scope: ["Distribution Unit", "Material Assignments", "Consumption"],
    icon: Truck,
  },
] as const;

/** Only same-app paths are honoured, so a crafted link cannot redirect a user off-site after login. */
function safeReturnPath(v: unknown): string {
  return typeof v === "string" && /^\/(?!\/)/.test(v) && !v.startsWith("/login") ? v : "/";
}

export function LoginPage() {
  const { status, login } = useSession();
  const navigate = useNavigate();
  const from = safeReturnPath((useLocation().state as { from?: unknown } | null)?.from);
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [selectedPersona, setSelectedPersona] = useState<string | null>(null);
  const { register, handleSubmit, formState, setValue } = useForm<LoginRequest>({ resolver: zodResolver(loginRequestSchema) });

  if (status === "authenticated") return <Navigate to={from} replace />;

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      await login(values);
      navigate(from, { replace: true });
    } catch (e) {
      setServerError(toRequestError(e).message);
    }
  });

  const selectPersona = (persona: typeof demoPersonas[number]) => {
    setSelectedPersona(persona.id);
    setValue("email", persona.email, { shouldDirty: true, shouldValidate: true });
    setValue("password", "opshub-dev-1", { shouldDirty: true, shouldValidate: true });
  };
  const activePersona = demoPersonas.find((persona) => persona.id === selectedPersona);

  return (
    <main className="relative min-h-screen grid lg:grid-cols-12 bg-[#3B82F6] overflow-x-hidden selection:bg-[#FBBC04] selection:text-[#0F172A]">
      {/* Playful polka-dot background pattern */}
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.3)_1.5px,transparent_1.5px)] [background-size:24px_24px] z-0"
        aria-hidden="true"
      />


      <div className="pointer-events-none absolute bottom-12 left-10 z-0 hidden lg:block -rotate-6">
        <div className="flex items-center gap-2 rounded-2xl border-2 border-[#1E293B] bg-[#34A853] p-3 text-xs font-black text-white shadow-[4px_4px_0px_#1E293B]">
          <span>⚡ MULTI-SITE FLEET</span>
        </div>
      </div>

      {/* Brand hero panel (50% on desktop) */}
      <div className="relative z-10 hidden lg:flex lg:col-span-6 flex-col justify-between p-10 xl:p-14 overflow-hidden">
        {/* Top Header Section */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3.5 bg-white border-2 border-[#1E293B] px-4 py-2.5 rounded-2xl shadow-[4px_4px_0px_#1E293B]">
            <img
              src="/navi-logo.png"
              alt="NAVI"
              className="h-10 w-auto object-contain rounded-lg"
            />
            <div className="flex flex-col">
              <span className="font-['Outfit',sans-serif] text-xl font-black tracking-tight text-[#0F172A]">
                NAVI <span className="text-[#3B82F6]">Operations</span>
              </span>
              <span className="font-['Outfit',sans-serif] text-[11px] font-bold tracking-wider text-[#64748B] uppercase">
                COMMAND CENTER
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-full border-2 border-[#1E293B] bg-white px-3.5 py-1.5 text-xs font-bold text-[#0F172A] shadow-[3px_3px_0px_#1E293B]">
            <span className="h-2.5 w-2.5 rounded-full bg-[#34A853] border border-[#1E293B]" />
            <span className="text-[#64748B]">SYSTEM:</span>
            <span className="text-[#34A853] font-black">ONLINE</span>
          </div>
        </div>

        {/* Central Hero Notebook Card */}
        <div className="my-auto py-6 max-w-xl">
          <div className="relative devfest-card p-8 bg-white">
            {/* Spiral Notebook Ring Accents along top */}
            <div className="absolute -top-3.5 left-8 right-8 flex justify-between pointer-events-none">
              {[...Array(9)].map((_, i) => (
                <div key={i} className="h-7 w-3.5 rounded-full border-2 border-[#1E293B] bg-[#E2E8F0] shadow-sm" />
              ))}
            </div>

            <div className="mt-2 mb-3 inline-flex items-center gap-2 rounded-full border-2 border-[#1E293B] bg-[#FBBC04] px-3.5 py-1 font-['Outfit',sans-serif] text-xs font-black uppercase text-[#0F172A] shadow-[2px_2px_0px_#1E293B]">
              <span>✨ OPERATIONS SUITE</span>
            </div>

            <h1 className="font-['Outfit',sans-serif] text-5xl xl:text-6xl font-black leading-[1.02] tracking-tight text-[#0F172A]">
              ALL OPERATIONS.<br />
              <span className="text-[#3B82F6] underline decoration-[#FBBC04] decoration-4 underline-offset-4">ONE HUB.</span>
            </h1>

            <div className="mt-4 flex flex-wrap gap-2 text-xs font-extrabold text-[#0F172A]">
              <span className="rounded-xl border-2 border-[#1E293B] bg-[#EA4335] px-2.5 py-1 text-white shadow-[2px_2px_0px_#1E293B]">STORES</span>
              <span className="rounded-xl border-2 border-[#1E293B] bg-[#34A853] px-2.5 py-1 text-white shadow-[2px_2px_0px_#1E293B]">SERVICE CENTRE</span>
              <span className="rounded-xl border-2 border-[#1E293B] bg-[#FBBC04] px-2.5 py-1 text-[#0F172A] shadow-[2px_2px_0px_#1E293B]">DISTRIBUTION</span>
            </div>

            <p className="mt-4 text-sm font-medium leading-relaxed text-[#475569]">
              Direct operational control for inventory ledgering, automated approval routing, precision material assignment, and real-time site telemetry.
            </p>

            {/* DevFest Sticker Multi-Site Blueprint */}
            <div className="mt-6 rounded-2xl border-2 border-[#1E293B] bg-[#F8FAFC] p-4 shadow-[2px_2px_0px_#1E293B]">
              <div className="mb-2 flex items-center justify-between font-['Outfit',sans-serif] text-xs font-bold text-[#64748B]">
                <span className="uppercase">// MULTI-SITE TOPOLOGY SCHEMATIC</span>
                <span className="rounded-md border border-[#1E293B] bg-[#34A853]/20 text-[#166534] px-2 py-0.5 text-[10px] font-black">ISOLATED RLS CELLS</span>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded-xl border-2 border-[#1E293B] bg-white p-2.5 shadow-[2px_2px_0px_#1E293B]">
                  <p className="font-['Outfit',sans-serif] text-xs font-black text-[#0F172A]">Central Stores</p>
                  <p className="text-[10px] text-[#64748B] font-bold">Stock & Ledger</p>
                </div>
                <div className="rounded-xl border-2 border-[#1E293B] bg-[#FBBC04] p-2.5 shadow-[2px_2px_0px_#1E293B]">
                  <p className="font-['Outfit',sans-serif] text-xs font-black text-[#0F172A]">OpsHub Engine</p>
                  <p className="text-[10px] text-[#0F172A] font-bold">Runtime Kernel</p>
                </div>
                <div className="rounded-xl border-2 border-[#1E293B] bg-white p-2.5 shadow-[2px_2px_0px_#1E293B]">
                  <p className="font-['Outfit',sans-serif] text-xs font-black text-[#0F172A]">Distribution</p>
                  <p className="text-[10px] text-[#64748B] font-bold">Dispatch Hub</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Technical Annotation Footer */}
        <div className="flex items-center justify-between rounded-xl border-2 border-[#1E293B] bg-white px-4 py-2 font-['Outfit',sans-serif] text-xs font-bold text-[#475569] shadow-[3px_3px_0px_#1E293B]">
          <div className="flex items-center gap-3">
            <span>ISOLATION: STRICT RLS</span>
            <span>·</span>
            <span>ENCRYPTION: AES-256</span>
            <span>·</span>
            <span>TELEMETRY: ACTIVE</span>
          </div>
          <span className="text-[#3B82F6] font-black">AUTH_VERSION: 2.5.0</span>
        </div>
      </div>

      {/* Authentication form panel (50% on desktop) */}
      <div className="relative z-10 flex lg:col-span-6 flex-col justify-center items-center lg:items-start p-5 sm:p-8 lg:py-8 lg:pl-8 lg:pr-10 xl:pl-12 xl:pr-14">
        <div className="relative z-10 w-full max-w-[440px]">
          {/* Mobile brand mark */}
          <div className="mb-6 lg:hidden text-center">
            <div className="inline-block p-2 rounded-2xl bg-white border-2 border-[#1E293B] shadow-[4px_4px_0px_#1E293B] mb-2">
              <img
                src="/navi-logo.png"
                alt="NAVI"
                className="mx-auto h-12 w-auto object-contain rounded-lg"
              />
            </div>
            <h1 className="font-['Outfit',sans-serif] text-2xl font-black text-white drop-shadow-[2px_2px_0px_#1E293B]">
              NAVI Operations
            </h1>
            <p className="font-['Outfit',sans-serif] text-xs font-bold text-white/90">
              Stores / Service / Distribution
            </p>
          </div>

          {/* Login Card Notebook Form */}
          <div className="devfest-card p-5 sm:p-6 bg-white relative">
            {/* Form Header */}
            <div className="mb-4">
              <div className="mb-1.5 inline-flex items-center gap-1.5 rounded-full border-2 border-[#1E293B] bg-[#34A853] px-3 py-0.5 text-[10px] font-black uppercase text-white shadow-[2px_2px_0px_#1E293B]">
                <span>●</span> OPERATOR ACCESS
              </div>
              <h2 id="login-title" aria-label="Sign in to OpsHub" className="font-['Outfit',sans-serif] text-2xl sm:text-3xl font-black tracking-tight text-[#0F172A]">
                Sign in to <span className="text-[#3B82F6]">NAVI</span>
              </h2>
              <p className="mt-1 text-xs font-medium text-[#64748B]">
                Enter authorized credentials to access unit workspaces.
              </p>
            </div>

            <section aria-labelledby="access-profile-title" className="mb-4">
              <div className="mb-2 flex items-center justify-between gap-2">
                <h3 id="access-profile-title" className="font-['Outfit',sans-serif] text-xs font-black uppercase tracking-wide text-[#334155]">
                  Choose an access profile
                </h3>
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#FEF3C7] px-2 py-1 text-[9px] font-black uppercase text-[#854D0E]">
                  <KeyRound className="h-3 w-3" /> Demo accounts
                </span>
              </div>

              <div role="group" aria-label="Choose a demo access role" className="grid grid-cols-3 gap-1.5">
                {demoPersonas.map((persona) => {
                  const Icon = persona.icon;
                  const selected = selectedPersona === persona.id;
                  return (
                    <button
                      key={persona.id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => selectPersona(persona)}
                      className={`flex min-h-9 items-center justify-center gap-1.5 rounded-lg border px-1.5 py-1.5 text-center text-[10px] font-extrabold leading-tight transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4285F4] focus-visible:ring-offset-1 ${
                        selected
                          ? "border-[#2563EB] bg-[#EFF6FF] text-[#1D4ED8] shadow-[inset_0_0_0_1px_#2563EB]"
                          : "border-[#CBD5E1] bg-white text-[#475569] hover:border-[#4285F4] hover:bg-[#F8FAFC]"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      <span>{persona.label}</span>
                      {selected && <Check className="h-3 w-3 shrink-0" aria-hidden />}
                    </button>
                  );
                })}
              </div>

              <div aria-live="polite" className="mt-2 min-h-8 rounded-lg bg-[#F8FAFC] px-2.5 py-2">
                {activePersona ? (
                  <>
                    <p className="text-[10px] font-bold leading-relaxed text-[#475569]">
                      <span className="font-black text-[#0F172A]">{activePersona.label}:</span>{" "}
                      {activePersona.scope.join(" · ")}
                    </p>
                    <p className="mt-1 text-[9px] font-semibold text-[#64748B]">
                      Demo credentials filled below. For demonstration only.
                    </p>
                  </>
                ) : (
                  <p className="text-[10px] font-medium leading-relaxed text-[#64748B]">
                    Choose a role to preview its access and fill the demo sign-in.
                  </p>
                )}
              </div>
            </section>

            <form
              onSubmit={onSubmit}
              noValidate
              aria-labelledby="login-title"
              className="space-y-3"
            >
              {serverError && (
                <div role="alert" className="rounded-xl border-2 border-[#1E293B] bg-[#EA4335] p-3 text-xs font-bold text-white shadow-[3px_3px_0px_#1E293B]">
                  {serverError}
                </div>
              )}

              <TextField
                label="Email"
                type="email"
                autoComplete="username"
                placeholder="operator@opshub.local"
                error={formState.errors.email?.message}
                {...register("email")}
              />

              <TextField
                label="Password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="••••••••••••"
                error={formState.errors.password?.message}
                rightAction={
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="p-1 text-[#64748B] hover:text-[#0F172A] transition"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                }
                {...register("password")}
              />

              <Button
                type="submit"
                variant="primary"
                loading={formState.isSubmitting}
                className="w-full mt-2 h-12 text-sm font-black uppercase tracking-wider rounded-xl devfest-btn"
              >
                <span>Sign in</span>
                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
              </Button>

            </form>
          </div>

          {/* Discreet Help Info */}
          <div className="mt-4 flex items-center justify-between text-xs font-bold text-white drop-shadow-[1px_1px_0px_#1E293B]">
            <span>Need access clearance?</span>
            <span className="underline decoration-2 hover:text-[#FBBC04] cursor-pointer transition">Contact Site Administrator</span>
          </div>
        </div>
      </div>
    </main>
  );
}
