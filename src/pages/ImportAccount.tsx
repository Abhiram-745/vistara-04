import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileJson, AlertCircle, CheckCircle2 } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

export default function ImportAccount() {
  const [file, setFile] = useState<File | null>(null);
  const [importData, setImportData] = useState<any>(null);
  const [importing, setImporting] = useState(false);
  const [importMode, setImportMode] = useState<"merge" | "replace">("merge");
  const [report, setReport] = useState<any>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (selectedFile.type !== "application/json") {
      toast({
        title: "Invalid File",
        description: "Please upload a JSON file.",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        
        if (!data.export_version || !data.data) {
          throw new Error("Invalid export file format");
        }

        setImportData(data);
        setFile(selectedFile);
        toast({
          title: "File Loaded",
          description: "Export file validated successfully.",
        });
      } catch (error) {
        toast({
          title: "Invalid File",
          description: "The selected file is not a valid Vistari export.",
          variant: "destructive",
        });
      }
    };
    reader.readAsText(selectedFile);
  };

  const handleImport = async () => {
    if (!importData) return;

    try {
      setImporting(true);
      
      const { data, error } = await supabase.functions.invoke('import-account', {
        body: { importData, mode: importMode },
      });

      if (error) throw error;

      setReport(data.report);
      
      toast({
        title: "Import Complete",
        description: "Your account data has been imported successfully.",
      });

      setTimeout(() => {
        navigate("/dashboard");
      }, 3000);
    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: "Import Failed",
        description: "Failed to import account data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold">Import Account Data</h1>
          <p className="text-muted-foreground mt-2">
            Upload a Vistari export file to restore your data
          </p>
        </div>

        {!importData && !report && (
          <Card>
            <CardHeader>
              <CardTitle>Upload Export File</CardTitle>
              <CardDescription>
                Select the JSON file you exported from another Vistari account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <label htmlFor="file-upload" className="cursor-pointer">
                <div className="border-2 border-dashed border-border rounded-lg p-12 text-center hover:border-primary/50 transition-colors">
                  <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mb-2">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-xs text-muted-foreground">
                    JSON files only (Max 10MB)
                  </p>
                </div>
                <input
                  id="file-upload"
                  type="file"
                  accept=".json"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </CardContent>
          </Card>
        )}

        {importData && !report && (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileJson className="w-5 h-5" />
                  Import Preview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Timetables</p>
                    <p className="text-2xl font-bold">{importData.metadata.total_timetables}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Subjects</p>
                    <p className="text-2xl font-bold">{importData.metadata.total_subjects}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Homework</p>
                    <p className="text-2xl font-bold">{importData.metadata.total_homework}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Events</p>
                    <p className="text-2xl font-bold">{importData.metadata.total_events}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Study Sessions</p>
                    <p className="text-2xl font-bold">{importData.metadata.total_study_sessions}</p>
                  </div>
                </div>

                <div className="pt-4">
                  <p className="text-sm font-medium mb-3">Export Details</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Original Account:</span>
                      <span className="font-medium">{importData.user_email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Export Date:</span>
                      <span className="font-medium">
                        {new Date(importData.export_date).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Version:</span>
                      <span className="font-medium">{importData.export_version}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Import Mode</CardTitle>
                <CardDescription>
                  Choose how to handle existing data
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RadioGroup value={importMode} onValueChange={(value: any) => setImportMode(value)}>
                  <div className="flex items-start space-x-2 p-4 border rounded-lg">
                    <RadioGroupItem value="merge" id="merge" />
                    <Label htmlFor="merge" className="flex-1 cursor-pointer">
                      <div className="font-medium">Merge with existing data</div>
                      <div className="text-sm text-muted-foreground">
                        Keep your current data and add imported data alongside it
                      </div>
                    </Label>
                  </div>
                  <div className="flex items-start space-x-2 p-4 border rounded-lg">
                    <RadioGroupItem value="replace" id="replace" />
                    <Label htmlFor="replace" className="flex-1 cursor-pointer">
                      <div className="font-medium">Replace existing data</div>
                      <div className="text-sm text-muted-foreground">
                        Delete all current data and replace with imported data
                      </div>
                    </Label>
                  </div>
                </RadioGroup>

                {importMode === "replace" && (
                  <Alert className="mt-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Warning: This will permanently delete all your current data. This action cannot be undone.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            <div className="flex gap-4">
              <Button
                onClick={() => {
                  setFile(null);
                  setImportData(null);
                }}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button onClick={handleImport} disabled={importing} className="flex-1">
                {importing ? "Importing..." : "Import Data"}
              </Button>
            </div>
          </>
        )}

        {importing && (
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" />
                  <p className="text-sm font-medium">Importing your data...</p>
                </div>
                <Progress value={undefined} className="w-full" />
              </div>
            </CardContent>
          </Card>
        )}

        {report && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                Import Complete
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {report.success.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-green-600 mb-2">
                    Successfully Imported ({report.success.length})
                  </p>
                  <div className="space-y-1">
                    {report.success.map((item: any, idx: number) => (
                      <div key={idx} className="text-sm text-muted-foreground">
                        • {item.table}: {item.count || 1} item(s)
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {report.errors.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-red-600 mb-2">
                    Errors ({report.errors.length})
                  </p>
                  <div className="space-y-1">
                    {report.errors.map((item: any, idx: number) => (
                      <div key={idx} className="text-sm text-muted-foreground">
                        • {item.table}: {item.error}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Button onClick={() => navigate("/dashboard")} className="w-full mt-4">
                Go to Dashboard
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
