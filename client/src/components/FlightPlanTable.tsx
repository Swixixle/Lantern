import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const flightPlanData = [
  { year: 1, phase: "Cold Build", revenue: 30000, draw: 0, savings: 0, totalSavings: 15000, notes: "Start" },
  { year: 2, phase: "First Proof", revenue: 100000, draw: 40000, savings: 0, totalSavings: 15000, notes: "Buffer Phase" },
  { year: 3, phase: "MVSR Entry", revenue: 184000, draw: 112000, savings: 45000, totalSavings: 60000, notes: "Break-Even" },
  { year: 4, phase: "Stability", revenue: 210000, draw: 130000, savings: 58000, totalSavings: 118000, notes: "Scale" },
  { year: 5, phase: "Home Buy", revenue: 250000, draw: 160000, savings: 82000, totalSavings: 200000, notes: "Threshold" },
];

export function FlightPlanTable() {
  return (
    <Card className="border-border bg-card/50 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="font-mono text-sm uppercase tracking-widest text-muted-foreground">
          5-Year Sovereignty Curve Data
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-muted">
              <TableHead className="w-[80px] font-mono text-muted-foreground">Year</TableHead>
              <TableHead className="font-mono text-muted-foreground">Phase</TableHead>
              <TableHead className="text-right font-mono text-muted-foreground">Revenue</TableHead>
              <TableHead className="text-right font-mono text-muted-foreground">Draw (Gross)</TableHead>
              <TableHead className="text-right font-mono text-muted-foreground">Savings</TableHead>
              <TableHead className="text-right font-mono text-muted-foreground">Total Liquid</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {flightPlanData.map((row) => (
              <TableRow key={row.year} className="hover:bg-muted/50 border-muted group transition-colors">
                <TableCell className="font-mono font-bold text-muted-foreground group-hover:text-foreground">
                  0{row.year}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="font-mono text-xs font-normal border-muted-foreground/30 text-foreground bg-secondary/50">
                    {row.phase}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-mono text-muted-foreground group-hover:text-amber-500 transition-colors">
                  ${row.revenue.toLocaleString()}
                </TableCell>
                <TableCell className="text-right font-mono text-muted-foreground group-hover:text-foreground">
                  ${row.draw.toLocaleString()}
                </TableCell>
                <TableCell className="text-right font-mono text-muted-foreground group-hover:text-emerald-500 transition-colors">
                  ${row.savings.toLocaleString()}
                </TableCell>
                <TableCell className="text-right font-mono font-bold text-foreground">
                  ${row.totalSavings.toLocaleString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
