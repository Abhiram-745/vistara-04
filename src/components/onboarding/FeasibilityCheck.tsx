import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, AlertTriangle, TrendingUp } from "lucide-react";
import { FeasibilityResult } from "@/utils/feasibilityCalculator";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

interface FeasibilityCheckProps {
  result: FeasibilityResult;
}

const FeasibilityCheck = ({ result }: FeasibilityCheckProps) => {
  const [showDetails, setShowDetails] = useState(false);

  // Status icon and color
  const getStatusConfig = () => {
    switch (result.status) {
      case "over-scheduled":
        return {
          icon: AlertCircle,
          color: "text-destructive",
          bgColor: "bg-destructive/10",
          borderColor: "border-destructive/20",
          label: "Over-scheduled",
          description: "You may struggle to complete all work in the given timeframe",
        };
      case "optimal":
        return {
          icon: CheckCircle,
          color: "text-secondary",
          bgColor: "bg-secondary/10",
          borderColor: "border-secondary/20",
          label: "Optimal",
          description: "Perfect balance - challenging but achievable!",
        };
      case "balanced":
        return {
          icon: TrendingUp,
          color: "text-primary",
          bgColor: "bg-primary/10",
          borderColor: "border-primary/20",
          label: "Balanced",
          description: "Good workload distribution across your study period",
        };
      case "under-utilized":
        return {
          icon: AlertTriangle,
          color: "text-accent",
          bgColor: "bg-accent/10",
          borderColor: "border-accent/20",
          label: "Under-utilized",
          description: "You have extra time available for additional study",
        };
    }
  };

  const statusConfig = getStatusConfig();
  const StatusIcon = statusConfig.icon;

  // Chart data and colors
  const chartData = result.weeklyDistribution;
  const getBarColor = (status: string) => {
    switch (status) {
      case "manageable":
        return "hsl(var(--secondary))";
      case "busy":
        return "hsl(var(--primary))";
      case "overwhelming":
        return "hsl(var(--destructive))";
      default:
        return "hsl(var(--muted))";
    }
  };

  return (
    <Card className={`p-6 border-2 ${statusConfig.borderColor} ${statusConfig.bgColor}`}>
      {/* Status Header */}
      <div className="flex items-start gap-4 mb-4">
        <div className={`p-3 rounded-lg ${statusConfig.bgColor}`}>
          <StatusIcon className={`h-6 w-6 ${statusConfig.color}`} />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-display font-semibold text-lg">Time Feasibility Check</h3>
            <Badge variant="outline" className={statusConfig.color}>
              {statusConfig.label}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{statusConfig.description}</p>
        </div>
      </div>

      {/* Hours Breakdown */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="text-center p-3 bg-card rounded-lg border border-border">
          <div className="text-2xl font-display font-bold text-foreground">
            {result.totalHoursNeeded}h
          </div>
          <div className="text-xs text-muted-foreground mt-1">Hours Needed</div>
        </div>
        <div className="text-center p-3 bg-card rounded-lg border border-border">
          <div className="text-2xl font-display font-bold text-foreground">
            {result.totalAvailableHours}h
          </div>
          <div className="text-xs text-muted-foreground mt-1">Hours Available</div>
        </div>
        <div className="text-center p-3 bg-card rounded-lg border border-border">
          <div
            className={`text-2xl font-display font-bold ${
              result.difference >= 0 ? "text-secondary" : "text-destructive"
            }`}
          >
            {result.difference > 0 ? "+" : ""}
            {result.difference}h
          </div>
          <div className="text-xs text-muted-foreground mt-1">Difference</div>
        </div>
      </div>

      {/* Weekly Distribution Chart */}
      <div className="mb-4">
        <h4 className="text-sm font-medium mb-3">Weekly Workload Distribution</h4>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="week"
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
            />
            <YAxis
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
              label={{ value: "Hours", angle: -90, position: "insideLeft", fontSize: 12 }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
              }}
              labelStyle={{ color: "hsl(var(--foreground))" }}
            />
            <Bar dataKey="hours" radius={[8, 8, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getBarColor(entry.status)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="flex items-center justify-center gap-6 mt-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: "hsl(var(--secondary))" }} />
            <span className="text-muted-foreground">Manageable</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: "hsl(var(--primary))" }} />
            <span className="text-muted-foreground">Busy</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: "hsl(var(--destructive))" }} />
            <span className="text-muted-foreground">Overwhelming</span>
          </div>
        </div>
      </div>

      {/* Recommendations */}
      <div className="space-y-2 mb-4">
        <h4 className="text-sm font-medium">Recommendations</h4>
        <ul className="space-y-2">
          {result.recommendations.map((rec, index) => (
            <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>{rec}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Detailed Breakdown (Collapsible) */}
      <Collapsible open={showDetails} onOpenChange={setShowDetails}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="w-full gap-2">
            <span className="text-xs">
              {showDetails ? "Hide" : "Show"} Detailed Breakdown
            </span>
            <ChevronDown
              className={`h-4 w-4 transition-transform ${showDetails ? "rotate-180" : ""}`}
            />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-4">
          <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Topics:</span>
              <span className="font-medium">{result.breakdown.topics}h</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Homework:</span>
              <span className="font-medium">{result.breakdown.homework}h</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Test Preparation:</span>
              <span className="font-medium">{result.breakdown.testPrep}h</span>
            </div>
            <div className="border-t border-border pt-3 flex justify-between text-sm font-semibold">
              <span>Total:</span>
              <span>{result.totalHoursNeeded}h</span>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export default FeasibilityCheck;
