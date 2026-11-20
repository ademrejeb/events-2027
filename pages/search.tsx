import type { GetServerSideProps } from "next";

/**
 * The standalone /search page was retired: all published actions are now
 * fetched once and filtered instantly inside the "Actions" section of the
 * home page. Keep this route as a permanent-compatible redirect so old links
 * keep working.
 */
export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const raw = typeof ctx.query.q === "string" ? ctx.query.q.trim().slice(0, 120) : "";
  return {
    redirect: {
      destination: raw
        ? `/?q=${encodeURIComponent(raw)}#evenements`
        : "/#evenements",
      permanent: false,
    },
  };
};

export default function SearchRedirect() {
  return null;
}
