import { Box, Grid, Skeleton } from "@mui/material";

export default function DashboardSkeleton() {
  return (
    <Box sx={{ width: "100%", mt: 2 }}>
      {/* サマリーカードのスケルトン */}
      <Grid container spacing={2} mb={4}>
        {[1, 2, 3, 4].map((item) => (
          <Grid size={{ xs: 6, md: 3 }} key={item}>
            <Skeleton
              variant="rectangular"
              height={100}
              sx={{ borderRadius: 2, bgcolor: "rgba(255,255,255,0.05)" }}
            />
          </Grid>
        ))}
      </Grid>

      {/* 資産推移チャートのスケルトン */}
      {/* 修正: Paper から Box に変更し、bgcolorとborderを削除して透明にする */}
      <Box
        sx={{
          mb: 4,
          borderRadius: 2,
          height: 350,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Skeleton
          width="20%"
          height={32}
          sx={{ mb: 2, bgcolor: "rgba(255,255,255,0.05)" }}
        />
        <Skeleton
          variant="rectangular"
          height={260}
          sx={{ borderRadius: 1, bgcolor: "rgba(255,255,255,0.05)" }}
        />
      </Box>

      {/* ヒートマップ用のスケルトン */}
      {/* 修正: Paper から Box に変更し、bgcolorとborderを削除して透明にする */}
      <Box
        sx={{
          mb: 4,
          mt: 4,
          borderRadius: 2,
          height: 380,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Skeleton
          width="20%"
          height={32}
          sx={{ mb: 2, bgcolor: "rgba(255,255,255,0.05)" }}
        />
        <Skeleton
          variant="rectangular"
          height={270}
          sx={{ borderRadius: 1, bgcolor: "rgba(255,255,255,0.05)" }}
        />
      </Box>

      {/* テーブルのスケルトン */}
      <Box mt={4}>
        <Skeleton
          width="20%"
          height={32}
          sx={{ mb: 2, bgcolor: "rgba(255,255,255,0.05)" }}
        />
        {[1, 2, 3].map((item) => (
          <Skeleton
            key={item}
            variant="rectangular"
            height={60}
            sx={{ mb: 1, borderRadius: 1, bgcolor: "rgba(255,255,255,0.05)" }}
          />
        ))}
      </Box>
    </Box>
  );
}
