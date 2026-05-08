// import { useState } from 'react';
// import { AuthService } from '@/services/AuthService';
// import { Button } from '@/components/ui/button';
// import { Input } from '@/components/ui/input';
// import { useToast } from '@/components/ui/use-toast';
// import { Loader2 } from 'lucide-react';
// import { useNavigate } from 'react-router-dom';

// export default function RegisterPage() {
//     const [formData, setFormData] = useState({
//         name: '',
//         email: '',
//         password: '',
//     });
//     const [loading, setLoading] = useState(false);
//     const { toast } = useToast();
//     const navigate = useNavigate();

//     const handleRegister = async (e: React.FormEvent) => {
//         e.preventDefault();
//         setLoading(true);

//         try {
//             await AuthService.register(formData);

//             toast({
//                 title: "Registration Successful",
//                 description: "Please log in with your credentials.",
//             });

//             navigate('/login');
//         } catch (error: any) {
//             const errorData = error.response?.data;
//             let errorMessage = errorData?.message || "Something went wrong";

//             if (errorData?.errors && Array.isArray(errorData.errors)) {
//                 // Collect specific validation messages
//                 const details = errorData.errors.map((err: any) => err.msg).join('. ');
//                 errorMessage = `${errorMessage}: ${details}`;
//             }

//             toast({
//                 variant: "destructive",
//                 title: "Registration Failed",
//                 description: errorMessage,
//             });
//         } finally {
//             setLoading(false);
//         }
//     };

//     const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//         setFormData({ ...formData, [e.target.name]: e.target.value });
//     };

//     return (
//         <div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-gray-900">
//             <div className="w-full max-w-md space-y-8 rounded-lg border bg-white p-6 shadow-lg dark:bg-gray-800 dark:border-gray-700">
//                 <div className="text-center">
//                     <h2 className="mt-6 text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Create Account</h2>
//                     <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
//                         Sign up for the Radiology Project
//                     </p>
//                 </div>
//                 <form className="mt-8 space-y-6" onSubmit={handleRegister}>
//                     <div className="space-y-4 rounded-md shadow-sm">
//                         <div>
//                             <label htmlFor="name" className="sr-only">Full Name</label>
//                             <Input
//                                 id="name"
//                                 name="name"
//                                 type="text"
//                                 required
//                                 className="relative block w-full rounded-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
//                                 placeholder="Full Name"
//                                 value={formData.name}
//                                 onChange={handleChange}
//                             />
//                         </div>
//                         <div>
//                             <label htmlFor="email-address" className="sr-only">Email address</label>
//                             <Input
//                                 id="email-address"
//                                 name="email"
//                                 type="email"
//                                 required
//                                 className="relative block w-full rounded-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
//                                 placeholder="Email address"
//                                 value={formData.email}
//                                 onChange={handleChange}
//                             />
//                         </div>
//                         <div>
//                             <label htmlFor="password" className="sr-only">Password</label>
//                             <Input
//                                 id="password"
//                                 name="password"
//                                 type="password"
//                                 required
//                                 className="relative block w-full rounded-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
//                                 placeholder="Password"
//                                 value={formData.password}
//                                 onChange={handleChange}
//                             />
//                             <p className="text-xs text-gray-500 mt-1">
//                                 Must contain 6+ chars, 1 uppercase, 1 lowercase, 1 number, 1 special char (@$!%*?&).
//                             </p>
//                         </div>
//                     </div>

//                     <div>
//                         <Button
//                             type="submit"
//                             disabled={loading}
//                             className="group relative flex w-full justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
//                         >
//                             {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Register'}
//                         </Button>
//                     </div>
//                     <div className="text-sm text-center">
//                         <a href="/login" className="font-semibold text-indigo-600 hover:text-indigo-500">
//                             Already have an account? Sign in
//                         </a>
//                     </div>
//                 </form>
//             </div>
//         </div>
//     );
// }
