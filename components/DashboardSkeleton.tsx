// components/DashboardSkeleton.tsx
"use client";

import {
  Box,
  Card,
  CardContent,
  Grid, // Grid v2
  Paper,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";

export default function DashboardSkeleton() {
  const summaryItems = [1, 2, 3];
  const tableRows = [1, 2, 3, 4, 5];

  return (
    <Box>
      {/* 1. Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        {summaryItems.map((id) => (
          <Grid size={{ xs: 12, sm: 4 }} key={`summary-${id}`}>
            <Card
              sx={{
                height: "100%",
                bgcolor: "background.paper",
                borderRadius: 2,
              }}
            >
              <CardContent sx={{ py: 2, px: 2 }}>
                <Box display="flex" alignItems="center" mb={1}>
                  <Skeleton
                    variant="circular"
                    width={20}
                    height={20}
                    sx={{ mr: 1 }}
                  />
                  <Skeleton variant="text" width={80} />
                </Box>
                <Skeleton variant="text" width={120} height={40} />
                <Skeleton variant="text" width={100} />
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* 2. Asset History Chart (追加: 推移グラフ用のスケルトン) */}
      <Card
        sx={{
          height: "100%",
          bgcolor: "background.paper",
          borderRadius: 2,
          mb: 4,
        }}
      >
        <CardContent sx={{ py: 2, px: 2 }}>
          <Box display="flex" alignItems="center" mb={2}>
            <Skeleton
              variant="circular"
              width={20}
              height={20}
              sx={{ mr: 1 }}
            />
            <Skeleton variant="text" width={100} />
          </Box>
          <Skeleton
            variant="rectangular"
            width="100%"
            height={300}
            sx={{ borderRadius: 1 }}
          />
        </CardContent>
      </Card>

      {/* 3. Portfolio Chart (円グラフ) */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        {[1, 2].map((id) => (
          <Grid size={{ xs: 12, md: 6 }} key={`pie-${id}`}>
            <Card
              sx={{
                height: "100%",
                bgcolor: "background.paper",
                borderRadius: 2,
              }}
            >
              <CardContent sx={{ pb: 1 }}>
                <Box display="flex" alignItems="center" mb={1}>
                  <Skeleton
                    variant="circular"
                    width={20}
                    height={20}
                    sx={{ mr: 1 }}
                  />
                  <Skeleton variant="text" width={150} />
                </Box>
                <Box
                  display="flex"
                  justifyContent="center"
                  alignItems="center"
                  height={240}
                >
                  <Skeleton variant="circular" width={200} height={200} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* 4. Table */}
      <Box sx={{ mb: 4 }}>
        <Skeleton variant="text" width={150} height={30} sx={{ mb: 2 }} />
        <TableContainer
          component={Paper}
          elevation={3}
          sx={{ bgcolor: "background.paper" }}
        >
          <Table>
            <TableHead>
              <TableRow>
                <TableCell width="35%">
                  <Skeleton variant="text" width={80} />
                </TableCell>
                <TableCell align="right" width="20%">
                  <Skeleton variant="text" width={60} />
                </TableCell>
                <TableCell align="right" width="20%">
                  <Skeleton variant="text" width={60} />
                </TableCell>
                <TableCell align="right" width="15%">
                  <Skeleton variant="text" width={60} />
                </TableCell>
                <TableCell align="center" width="10%">
                  <Skeleton variant="circular" width={24} height={24} />
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {tableRows.map((id) => (
                <TableRow key={`row-${id}`}>
                  <TableCell>
                    <Box>
                      <Skeleton variant="text" width={120} />
                      <Skeleton variant="text" width={80} />
                    </Box>
                  </TableCell>
                  <TableCell align="right">
                    <Skeleton variant="text" width={80} />
                    <Skeleton variant="text" width={50} />
                  </TableCell>
                  <TableCell align="right">
                    <Skeleton variant="text" width={80} />
                    <Skeleton variant="text" width={50} />
                  </TableCell>
                  <TableCell align="right">
                    <Skeleton variant="rounded" width={80} height={24} />
                  </TableCell>
                  <TableCell align="center">
                    <Skeleton variant="circular" width={24} height={24} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </Box>
  );
}
