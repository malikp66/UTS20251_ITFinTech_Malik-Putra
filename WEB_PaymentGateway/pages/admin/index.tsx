import { type GetServerSideProps, type GetServerSidePropsResult } from "next";

const AdminIndex = () => null;

export const getServerSideProps: GetServerSideProps = async (): Promise<GetServerSidePropsResult<Record<string, never>>> => {
  return {
    redirect: {
      destination: "/admin/dashboard",
      permanent: false,
    },
  };
};

export default AdminIndex;
