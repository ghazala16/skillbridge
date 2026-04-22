import { SignUp } from '@clerk/nextjs';

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div>
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-sky-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-black">SB</span>
            </div>
            <span className="font-bold text-slate-900">SkillBridge</span>
          </div>
          <p className="text-slate-500 text-sm">Create your account</p>
        </div>
        <SignUp />
      </div>
    </div>
  );
}
