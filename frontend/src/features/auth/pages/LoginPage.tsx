import { useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { AuthService } from '@/services/AuthService';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Mail, Lock, ArrowRight } from 'lucide-react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import mainLogo from "@/assets/images/ArmorrayLogo.jpeg";

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const { setAuth } = useAuthStore();
    const { toast } = useToast();
    const navigate = useNavigate();
    const location = useLocation();

    const from = (location.state as any)?.from?.pathname || null;

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { user } = await AuthService.login({ email, password });
            setAuth(user);

            toast({
                title: "Login Successful",
                description: `Welcome back, ${user.name}!`,
            });

            // Smart redirection: Go back to where they came from, or use role-based default
            if (from) {
                navigate(from, { replace: true });
            } else {
                switch (user.role) {
                    case 'technician':
                        navigate('/dashboard/technician', { replace: true });
                        break;
                    case 'radiologist':
                        navigate('/dashboard/radiologist', { replace: true });
                        break;
                    case 'admin':
                        navigate('/dashboard/admin', { replace: true });
                        break;
                    case 'qa':
                        navigate('/dashboard/qa', { replace: true });
                        break;
                    default:
                        navigate('/dashboard/user', { replace: true });
                }
            }
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Login Failed",
                description: error.response?.data?.message || "Invalid credentials",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-slate-950 font-sans">
            {/* Cinematic Video Background */}
            <div className="absolute inset-0 z-0">
                <video
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full h-full object-cover opacity-30 scale-105"
                >
                    <source
                        src="/assets/videos/Brain_Scan_Medical_Image_3840x2160.mp4"
                        type="video/mp4"
                    />
                </video>
                {/* Dynamic Overlays */}
                <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-950/80 to-blue-900/20" />
                <div className="absolute inset-0 backdrop-blur-[2px]" />
            </div>

            {/* Background Decorative Elements */}
            <div className="absolute top-1/4 -left-20 w-96 h-96 bg-blue-600/10 blur-[120px] rounded-full" />
            <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-indigo-600/10 blur-[120px] rounded-full" />

            {/* Login Container */}
            <div className="relative z-10 w-full max-w-[440px] px-6">
                <div className="bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-8 md:p-12 shadow-2xl shadow-black/50 overflow-hidden relative group">
                    {/* Subtle Internal Glow */}
                    <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-500/10 blur-3xl rounded-full group-hover:bg-blue-500/20 transition-colors duration-700" />

                    <div className="relative z-10 space-y-8">
                        {/* Branding */}
                        <div className="text-center space-y-4">
                            <Link to="/" className="inline-flex items-center gap-2 group/logo mb-2">
                                <img src={mainLogo} alt="Logo" className="h-10 w-auto group-hover/logo:scale-110 transition-transform duration-500" />
                                <span className="text-2xl font-bold tracking-tight text-white">
                                    Armor<span className="text-blue-600">ray</span>
                                </span>
                            </Link>
                            <h2 className="text-3xl font-bold text-white tracking-tight">Welcome Back</h2>
                            <p className="text-slate-400 text-sm font-medium">
                                Access your professional dashboard
                            </p>
                        </div>

                        <form onSubmit={handleLogin} className="space-y-6">
                            <div className="space-y-4">
                                {/* Email Field */}
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Email Address</label>
                                    <div className="relative group/input">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within/input:text-blue-500 transition-colors">
                                            <Mail size={18} />
                                        </div>
                                        <input
                                            type="email"
                                            required
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="doctor@quickscan.com"
                                            className="block w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-11 pr-4 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all"
                                        />
                                    </div>
                                </div>

                                {/* Password Field */}
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center ml-1">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Password</label>
                                    </div>
                                    <div className="relative group/input">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within/input:text-blue-500 transition-colors">
                                            <Lock size={18} />
                                        </div>
                                        <input
                                            type="password"
                                            required
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="••••••••"
                                            className="block w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-11 pr-4 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all"
                                        />
                                    </div>
                                </div>
                            </div>

                            <Button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 h-14 rounded-2xl text-white font-bold text-lg shadow-lg shadow-blue-600/20 active:scale-[0.98] transition-all group/btn"
                            >
                                {loading ? (
                                    <Loader2 className="animate-spin" />
                                ) : (
                                    <span className="flex items-center justify-center gap-2">
                                        Secure Login
                                        <ArrowRight className="group-hover/btn:translate-x-1 transition-transform" />
                                    </span>
                                )}
                            </Button>
                        </form>


                    </div>
                </div>


            </div>
        </div>
    );
}
