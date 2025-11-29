import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Download } from "lucide-react";
import { toast } from "sonner";
import { generateEnhancedLogo, downloadLogoAsFile } from "@/utils/generateLogo";

const LogoGenerator = () => {
  const [loading, setLoading] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const imageUrl = await generateEnhancedLogo();
      setLogoUrl(imageUrl);
      toast.success("Logo generated successfully!");
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to generate logo");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!logoUrl) return;
    
    try {
      const file = await downloadLogoAsFile(logoUrl);
      const url = URL.createObjectURL(file);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'vistari-logo-enhanced.png';
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Logo downloaded!");
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to download logo");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <Card className="w-full max-w-2xl glass-card">
        <CardHeader>
          <CardTitle className="gradient-text">Vistari Logo Generator</CardTitle>
          <CardDescription>Generate an enhanced AI-powered logo for Vistari</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Generating Logo...
              </>
            ) : (
              "Generate Enhanced Logo"
            )}
          </Button>

          {logoUrl && (
            <div className="space-y-4 animate-fade-in">
              <div className="relative p-8 bg-muted rounded-2xl flex items-center justify-center">
                <img
                  src={logoUrl}
                  alt="Generated Vistari Logo"
                  className="w-64 h-64 object-contain logo-glow-subtle hover:logo-glow transition-all duration-500"
                />
              </div>

              <Button
                onClick={handleDownload}
                variant="outline"
                className="w-full gap-2"
              >
                <Download className="h-4 w-4" />
                Download Logo
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                Save this logo to src/assets/vistari-logo.png to use it in the app
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LogoGenerator;
