import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Crown, Eye, EyeOff } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

const SuperAdminLogin = () => {
  const [credentials, setCredentials] = useState({
    username: "",
    password: ""
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
 const navigate = useNavigate();
const { toast } = useToast();
const { login } = useAuth();

 const handleLogin = async (e: React.FormEvent) => {
  e.preventDefault();
  setIsLoading(true);

  try {
    const loginResult = await login({
      login: credentials.username,
      password: credentials.password
    }, 'super_admin');

    if (loginResult.success) {
      toast({
        title: "Login Successful",
        description: "Welcome to the super admin dashboard.",
      });
      navigate("/super-admin/dashboard");
    } else {
      toast({
        title: "Login Failed",
        description: loginResult.error || "Invalid super admin credentials.",
        variant: "destructive",
      });
    }
  } catch (error) {
    toast({
      title: "Login Failed",
      description: "Connection error. Please try again.",
      variant: "destructive",
    });
  } finally {
    setIsLoading(false);
  }
};

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/30">
      <header className="bg-primary text-primary-foreground py-4 shadow-lg">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-4">
            <Link to="/">
              <Button variant="ghost" size="sm" className="text-primary-foreground hover:bg-primary-foreground/10">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Home
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <Crown className="h-6 w-6" />
              <h1 className="text-xl font-bold">Super Admin Access</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
                <Crown className="h-8 w-8 text-destructive" />
              </div>
              <CardTitle>Super Administrator</CardTitle>
              <CardDescription>
                System administration and village management access.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    type="text"
                    value={credentials.username}
                    onChange={(e) => setCredentials({...credentials, username: e.target.value})}
                    placeholder="Super admin username"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={credentials.password}
                      onChange={(e) => setCredentials({...credentials, password: e.target.value})}
                      placeholder="Super admin password"
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Logging in..." : "Login as Super Admin"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default SuperAdminLogin;
