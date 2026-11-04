import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import type { User } from '../../shared/auth';
import { api } from './api';
import { AuthPage } from './components/AuthPage';
import { TaskApp } from './TaskApp';

export default function App() {
  const client = useQueryClient();
  const { data, isPending, isError, refetch } = useQuery({ queryKey: ['me'], queryFn: api.me });
  const user = data?.user ?? null;

  const onAuthenticated = useCallback(
    (next: User) => {
      client.removeQueries({ queryKey: ['tasks'] });
      client.setQueryData(['me'], { user: next });
    },
    [client],
  );

  const logOut = useCallback(async () => {
    try {
      await api.logout();
    } catch (error) {
      toast.error((error as Error).message);
      return;
    }
    // Clearing the tasks stops the next person on this browser from seeing them.
    client.removeQueries({ queryKey: ['tasks'] });
    client.setQueryData(['me'], { user: null });
    toast.info('Logged out');
  }, [client]);

  return (
    <>
      {isPending ? (
        <div className="splash" role="status" aria-label="Loading" />
      ) : isError ? (
        <div className="splash">
          <div className="notice" role="alert">
            <h2>TaskTrack could not reach the server</h2>
            <button type="button" className="button button-primary" onClick={() => refetch()}>
              Try again
            </button>
          </div>
        </div>
      ) : user ? (
        <TaskApp key={user.id} user={user} onLogOut={logOut} />
      ) : (
        <AuthPage onAuthenticated={onAuthenticated} />
      )}
      <ToastContainer position="top-right" autoClose={2500} newestOnTop limit={3} theme="light" />
    </>
  );
}
