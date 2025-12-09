import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Shield, Eye, EyeOff, Lock, AlertTriangle } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

const AdminLogin = () => {
  // Login credentials state
  const [credentials, setCredentials] = useState({
    email: "",
    password: ""
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // PIN verification state
  const [showPinModal, setShowPinModal] = useState(false);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [isVerifyingPin, setIsVerifyingPin] = useState(false);
  const [villageInfo, setVillageInfo] = useState<{ villageId: string; villageName: string } | null>(null);

  // Setup required state
  const [showSetupRequired, setShowSetupRequired] = useState(false);

  const navigate = useNavigate();
  const { toast } = useToast();
  const { login, verifyPin } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const loginResult = await login({
        login: credentials.email,
        password: credentials.password
      }, 'admin');

      if (loginResult.success) {
        // Check if PIN verification is required
        if (loginResult.requiresPinVerification) {
          setVillageInfo({
            villageId: loginResult.villageId!,
            villageName: loginResult.villageName!
          });
          setShowPinModal(true);
          setIsLoading(false);
          return;
        }

        // Check if setup is required (first time login for primary admin)
        if (loginResult.requiresSetup) {
          setVillageInfo({
            villageId: loginResult.villageId!,
            villageName: loginResult.villageName!
          });
          setShowSetupRequired(true);
          setIsLoading(false);
          return;
        }

        // Direct login without PIN (legacy flow - should not happen with new system)
        toast({
          title: "Login Successful",
          description: "Welcome to the village admin dashboard.",
        });
        navigate("/admin/dashboard");
      } else {
        toast({
          title: "Login Failed",
          description: loginResult.error || "Invalid email or password.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Login Failed",
        description: "Unable to connect to server. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePinVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError("");

    // Validate PIN format
    if (!/^\d{4}$/.test(pin)) {
      setPinError("PIN must be exactly 4 digits");
      return;
    }

    setIsVerifyingPin(true);

    try {
      const result = await verifyPin(pin);

      if (result.success) {
        toast({
          title: "Login Successful",
          description: `Welcome back, ${result.user?.fullName || 'Admin'}!`,
        });
        setShowPinModal(false);
        navigate("/admin/dashboard");
      } else {
        setPinError(result.error || "Invalid PIN");
        setPin("");
      }
    } catch (error) {
      setPinError("Verification failed. Please try again.");
    } finally {
      setIsVerifyingPin(false);
    }
  };

  const handleCancelPinVerification = () => {
    setShowPinModal(false);
    setPin("");
    setPinError("");
    setVillageInfo(null);
    // Clear temporary storage
    localStorage.removeItem('temp-auth-token');
    localStorage.removeItem('temp-village-id');
    localStorage.removeItem('temp-village-name');
  };

  const handleCancelSetup = () => {
    setShowSetupRequired(false);
    setVillageInfo(null);
    // Clear temporary storage
    localStorage.removeItem('temp-auth-token');
    localStorage.removeItem('temp-village-id');
    localStorage.removeItem('temp-village-name');
  };

  const handleContinueSetup = () => {
    navigate(`/admin/setup?villageId=${villageInfo?.villageId}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/30">
      {/* Header */}
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
              <Shield className="h-6 w-6" />
              <h1 className="text-xl font-bold">Official Access</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
                <Shield className="h-8 w-8 text-destructive" />
              </div>
              <CardTitle>Headman/Chairman Login</CardTitle>
              <CardDescription>
                Secure access for village officials to manage certificate applications.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={credentials.email}
                    onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
                    placeholder="Enter your email address"
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
                      onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                      placeholder="Enter your password"
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

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? "Logging in..." : "Login"}
                </Button>
              </form>

              <div className="mt-6 p-4 bg-muted rounded-lg">
                <h4 className="text-sm font-medium mb-2">Login Instructions</h4>
                <div className="text-xs space-y-1 text-muted-foreground">
                  <p>• Use the email address you provided during village registration</p>
                  <p>• Contact the super admin if you forgot your password</p>
                  <p>• Your village must be approved before you can log in</p>
                  <p>• After password verification, enter your 4-digit approval PIN</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* PIN Verification Modal */}
      {showPinModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <Lock className="h-8 w-8 text-primary" />
              </div>
              <CardTitle>Enter Your PIN</CardTitle>
              <CardDescription>
                {villageInfo?.villageName && (
                  <span className="block font-medium text-foreground">
                    Village: {villageInfo.villageName}
                  </span>
                )}
                <span className="block mt-1">
                  Enter your 4-digit approval PIN to continue
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePinVerification} className="space-y-4">
                <div>
                  <Label htmlFor="pin">Approval PIN</Label>
                  <Input
                    id="pin"
                    type="password"
                    inputMode="numeric"
                    pattern="\d{4}"
                    maxLength={4}
                    value={pin}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '');
                      setPin(value);
                      setPinError("");
                    }}
                    placeholder="Enter 4-digit PIN"
                    className="text-center text-2xl tracking-widest"
                    autoFocus
                  />
                  {pinError && (
                    <p className="text-sm text-destructive mt-2">{pinError}</p>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={handleCancelPinVerification}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={isVerifyingPin || pin.length !== 4}
                  >
                    {isVerifyingPin ? "Verifying..." : "Verify PIN"}
                  </Button>
                </div>
              </form>

              <div className="mt-4 p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground text-center">
                  Your PIN is linked to your identity. Each sub village admin has their own unique PIN.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Setup Required Modal */}
      {showSetupRequired && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="h-8 w-8 text-amber-600" />
              </div>
              <CardTitle>Setup Required</CardTitle>
              <CardDescription>
                {villageInfo?.villageName && (
                  <span className="block font-medium text-foreground">
                    Village: {villageInfo.villageName}
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-center text-muted-foreground">
                  As the primary village admin, you need to complete your profile setup before you can start approving applications.
                </p>

                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <h4 className="font-medium text-sm">Setup includes:</h4>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Upload your Aadhaar card (front & back)</li>
                    <li>• Upload your passport photo</li>
                    <li>• Upload your signature image</li>
                    <li>• Upload your official seal</li>
                    <li>• Set your 4-digit approval PIN</li>
                    <li>• Select your designation</li>
                  </ul>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={handleCancelSetup}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={handleContinueSetup}
                  >
                    Continue Setup
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default AdminLogin;
