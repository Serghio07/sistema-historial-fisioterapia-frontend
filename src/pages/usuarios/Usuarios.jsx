import { useEffect, useState } from 'react';
import { FilePenLine, Trash2 } from 'lucide-react';
import ActionButton from '../../components/common/ActionButton';
import Loader from '../../components/common/Loader';
import UsuarioForm from './UsuarioForm';
import { createUsuario, deleteUsuario, getUsuarios, updateUsuario } from '../../services/usuarioService';
import { cleanPayload } from '../../utils/validators';

const initialForm = {
  nombre: '',
  usuario: '',
  email: '',
  password: '',
  rol: 'personal',
  estado: true
};

function Usuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      setUsuarios(await getUsuarios());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    setMessage('');
    const payload = cleanPayload({ ...form });
    if (editing && !payload.password) delete payload.password;
    try {
      editing ? await updateUsuario(editing, payload) : await createUsuario(payload);
      setForm(initialForm);
      setEditing(null);
      setMessage('Usuario guardado correctamente.');
      await load();
    } catch (err) {
      setMessage(err.message);
    }
  };

  return (
    <section className="grid gap-5">
      {loading && <Loader />}
      <div className="page-title">
        <div>
          <p>Administracion</p>
          <h2>Usuarios</h2>
          <span>Gestion de accesos del equipo.</span>
        </div>
      </div>
      {message && <p className="notice">{message}</p>}
      <div className="grid gap-5 lg:grid-cols-[390px_1fr]">
        <div className="panel">
          <h3 className="mb-4 text-lg font-bold text-ink">{editing ? 'Editar usuario' : 'Nuevo usuario'}</h3>
          <UsuarioForm
            form={form}
            setForm={setForm}
            editing={editing}
            onSubmit={submit}
            onCancel={() => {
              setEditing(null);
              setForm(initialForm);
            }}
          />
        </div>
        <div className="panel">
          <div className="grid gap-3">
            {usuarios.map((usuario) => (
              <article key={usuario.id} className="list-row">
                <div>
                  <strong>{usuario.nombre}</strong>
                  <span>{usuario.usuario} · {usuario.rol}</span>
                </div>
                <div className="flex gap-2">
                  <ActionButton
                    label="Editar usuario"
                    icon={FilePenLine}
                    tone="edit"
                    onClick={() => {
                      setEditing(usuario.id);
                      setForm({ ...initialForm, ...usuario, password: '' });
                    }}
                  />
                  <ActionButton label="Eliminar usuario" icon={Trash2} tone="delete" onClick={() => deleteUsuario(usuario.id).then(load)} />
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default Usuarios;
