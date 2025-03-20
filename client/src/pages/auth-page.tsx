import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/hooks/use-language";
import { insertUserSchema } from "@shared/schema";
import { useLocation } from "wouter";
import LanguageToggle from "@/components/LanguageToggle";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Brain, BookOpenText, Network } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
});

const registerSchema = insertUserSchema.extend({
  email: z.string().email({ message: "Please enter a valid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  path: ["confirmPassword"],
  message: "Passwords do not match",
});

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState<string>("login");
  const { user, loginMutation, registerMutation } = useAuth();
  const { t } = useLanguage();
  const [, navigate] = useLocation();

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [user, navigate]);

  // Login form
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Register form
  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onLoginSubmit = (data: LoginFormValues) => {
    loginMutation.mutate(data);
  };

  const onRegisterSubmit = (data: RegisterFormValues) => {
    const { confirmPassword, ...registerData } = data;
    registerMutation.mutate(registerData);
  };

  if (user) {
    return null; // Will redirect via useEffect
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="absolute top-4 right-4">
        <LanguageToggle />
      </div>
      
      <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        <Card className="w-full">
          <CardHeader className="space-y-1">
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-primary-600 rounded-md flex items-center justify-center">
                <Brain className="h-6 w-6 text-white" />
              </div>
              <CardTitle className="text-2xl font-bold">{t("app.name")}</CardTitle>
            </div>
            <CardDescription>
              {activeTab === "login" ? t("auth.loginSubtitle") : t("auth.registerSubtitle")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs
              defaultValue="login"
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login">{t("auth.login")}</TabsTrigger>
                <TabsTrigger value="register">{t("auth.register")}</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <Form {...loginForm}>
                  <form
                    onSubmit={loginForm.handleSubmit(onLoginSubmit)}
                    className="space-y-4"
                  >
                    <FormField
                      control={loginForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("auth.email")}</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="your.email@example.com"
                              type="email"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={loginForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("auth.password")}</FormLabel>
                          <FormControl>
                            <Input type="password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={loginMutation.isPending}
                    >
                      {loginMutation.isPending 
                        ? (t("auth.login") + "...") 
                        : t("auth.login")}
                    </Button>
                  </form>
                </Form>
              </TabsContent>

              <TabsContent value="register">
                <Form {...registerForm}>
                  <form
                    onSubmit={registerForm.handleSubmit(onRegisterSubmit)}
                    className="space-y-4"
                  >
                    <FormField
                      control={registerForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("auth.username")}</FormLabel>
                          <FormControl>
                            <Input placeholder="username" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={registerForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("auth.email")}</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="your.email@example.com"
                              type="email"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={registerForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("auth.password")}</FormLabel>
                          <FormControl>
                            <Input type="password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={registerForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            {t("auth.password") + " " + (t("auth.login") === "Login" ? "Confirmation" : "확인")}
                          </FormLabel>
                          <FormControl>
                            <Input type="password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={registerMutation.isPending}
                    >
                      {registerMutation.isPending 
                        ? (t("auth.register") + "...") 
                        : t("auth.register")}
                    </Button>
                  </form>
                </Form>
              </TabsContent>
            </Tabs>
          </CardContent>
          <CardFooter className="flex justify-center">
            <p className="text-sm text-gray-500">
              {activeTab === "login" ? (
                <>
                  {t("auth.login") === "Login" ? "Don't have an account?" : "계정이 없으신가요?"}{" "}
                  <button
                    onClick={() => setActiveTab("register")}
                    className="text-primary-600 hover:underline"
                  >
                    {t("auth.register")}
                  </button>
                </>
              ) : (
                <>
                  {t("auth.login") === "Login" ? "Already have an account?" : "이미 계정이 있으신가요?"}{" "}
                  <button
                    onClick={() => setActiveTab("login")}
                    className="text-primary-600 hover:underline"
                  >
                    {t("auth.login")}
                  </button>
                </>
              )}
            </p>
          </CardFooter>
        </Card>

        <div className="hidden md:flex flex-col items-center justify-center space-y-6 py-8">
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-bold text-gray-900">
              {t("auth.heroTitle")}
            </h2>
            <p className="text-xl text-gray-600 max-w-md">
              {t("auth.heroSubtitle")}
            </p>
          </div>
          
          <div className="grid grid-cols-1 gap-6 max-w-md w-full">
            <div className="flex items-start space-x-4">
              <div className="bg-primary-100 p-2 rounded-full">
                <BookOpenText className="h-6 w-6 text-primary-700" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">
                  {t("auth.login") === "Login" ? "Document Management" : "문서 관리"}
                </h3>
                <p className="text-gray-600">
                  {t("auth.login") === "Login" 
                    ? "Upload, organize, and find your documents with AI-powered metadata."
                    : "AI 기반 메타데이터로 문서를 업로드, 정리 및 검색하세요."}
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-4">
              <div className="bg-secondary-100 p-2 rounded-full">
                <Network className="h-6 w-6 text-secondary-700" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">
                  {t("sidebar.semantic")}
                </h3>
                <p className="text-gray-600">
                  {t("auth.login") === "Login" 
                    ? "Visualize connections between your documents and concepts."
                    : "문서와 개념 간의 연결을 시각화하세요."}
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-4">
              <div className="bg-amber-100 p-2 rounded-full">
                <Brain className="h-6 w-6 text-amber-700" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">
                  {t("auth.login") === "Login" ? "Intelligent Recommendations" : "지능형 추천"}
                </h3>
                <p className="text-gray-600">
                  {t("auth.login") === "Login" 
                    ? "Get personalized suggestions based on your knowledge graph."
                    : "지식 그래프를 기반으로 개인화된 추천을 받아보세요."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
