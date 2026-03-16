import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { toast } from 'sonner';

interface LoginPageProps {
    onLoginSuccess: () => void;
    onSkip: () => void;
}

export function LoginPage({ onLoginSuccess, onSkip }: LoginPageProps) {
    const { login } = useAuth();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        requestAnimationFrame(() => setMounted(true));
    }, []);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        await new Promise(res => setTimeout(res, 800));

        const result = login(username, password);
        setIsLoading(false);

        if (result.success) {
            toast.success('Login successful!');
            onLoginSuccess();
        } else {
            toast.error(result.error || 'Login failed');
        }
    };

    return (
        <div
            className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden font-['Adani'] transition-all duration-500"
        >
            {/* Background Image with Theme-aware Overlay */}
            <div
                className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-1000"
                style={{ backgroundImage: 'url("/login-bg.png")' }}
            />
            <div className="absolute inset-0 bg-primary/40 dark:bg-slate-950/80 backdrop-blur-[2px] transition-colors duration-500" />

            {/* Grid Pattern Overlay */}
            <div
                className="absolute inset-0 opacity-[0.1] pointer-events-none"
                style={{ backgroundImage: 'radial-gradient(white 0.5px, transparent 0.5px)', backgroundSize: '40px 40px' }}
            />

            {/* Logo Section */}
            <div
                className="relative z-10 mb-12 2xl:mb-20 transition-all duration-1000 ease-out"
                style={{
                    opacity: mounted ? 1 : 0,
                    transform: mounted ? 'translateY(0)' : 'translateY(-30px)',
                    transitionDelay: '200ms',
                }}
            >
                <div className="flex items-center gap-0 bg-white/10 backdrop-blur-md px-10 py-5 rounded-[2.5rem] border border-white/20 shadow-2xl">
                    <span
                        className="text-[48px] 2xl:text-[64px] font-black leading-none tracking-tighter"
                        style={{
                            background: 'linear-gradient(135deg, #ffffff 0%, #cbd5e1 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                        }}
                    >
                        adani
                    </span>
                    <span className="text-[48px] 2xl:text-[64px] font-thin text-white/40 mx-6 leading-none">|</span>
                    <span className="text-[32px] 2xl:text-[44px] font-light text-sky-400 leading-none tracking-[0.1em] uppercase">
                        Renewables
                    </span>
                </div>
            </div>

            {/* Login Card */}
            <div
                className="relative z-10 w-full max-w-[540px] 2xl:max-w-[700px] px-6 transition-all duration-1000 ease-out"
                style={{
                    opacity: mounted ? 1 : 0,
                    transform: mounted ? 'translateY(0)' : 'translateY(30px)',
                    transitionDelay: '400ms',
                }}
            >
                <div className="bg-white/95 dark:bg-slate-900/90 backdrop-blur-2xl rounded-[2.5rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] border border-white/20 dark:border-slate-800/50 px-12 py-14 2xl:px-16 2xl:py-20">
                    <div className="mb-12 2xl:mb-16 text-center">
                        <h2 className="text-3xl 2xl:text-5xl font-black text-slate-900 dark:text-white mb-3 tracking-tight">
                            Welcome Back
                        </h2>
                        <p className="text-[14px] 2xl:text-[18px] text-sky-600 dark:text-sky-400 font-bold uppercase tracking-widest opacity-80">
                            Connectivity Dashboard Access
                        </p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-8 2xl:space-y-12">
                        <div className="space-y-3">
                            <Label htmlFor="login-email" className="text-[12px] 2xl:text-[14px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">
                                Corporate Email
                            </Label>
                            <Input
                                id="login-email"
                                type="text"
                                placeholder="name@adani.com"
                                value={username}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUsername(e.target.value)}
                                required
                                className="h-14 2xl:h-20 bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/50 rounded-2xl px-6 text-[16px] 2xl:text-[20px] text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 transition-all shadow-inner"
                            />
                        </div>

                        <div className="space-y-3">
                            <Label htmlFor="login-password" className="text-[12px] 2xl:text-[14px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">
                                Security Key
                            </Label>
                            <Input
                                id="login-password"
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                                required
                                className="h-14 2xl:h-20 bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/50 rounded-2xl px-6 text-[16px] 2xl:text-[20px] text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 transition-all shadow-inner"
                            />
                        </div>

                        <Button
                            id="login-submit"
                            type="submit"
                            disabled={isLoading}
                            className="w-full h-16 2xl:h-20 bg-primary hover:bg-primary/90 text-white font-black text-[14px] 2xl:text-[18px] uppercase tracking-[0.3em] rounded-2xl shadow-2xl hover:shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 mt-10"
                        >
                            {isLoading ? (
                                <span className="flex items-center justify-center gap-3">
                                    <div className="w-5 h-5 2xl:w-6 2xl:h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                                    Authenticating...
                                </span>
                            ) : (
                                'Secure Access'
                            )}
                        </Button>
                    </form>
                </div>
            </div>

            {/* Footer */}
            <div
                className="relative z-10 mt-12 2xl:mt-20 text-center transition-all duration-1000 ease-out"
                style={{
                    opacity: mounted ? 1 : 0,
                    transitionDelay: '600ms',
                }}
            >
                <p className="text-[12px] 2xl:text-[14px] text-white/40 font-black uppercase tracking-[0.4em]">
                    © {new Date().getFullYear()} Adani Green Energy Ltd <span className="mx-4">|</span> Internal Systems
                </p>
            </div>
        </div>
    );
}