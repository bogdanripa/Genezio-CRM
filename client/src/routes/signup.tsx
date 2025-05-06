import React, {useState} from 'react';
import "./styles.css";
import {useNavigate} from 'react-router-dom';
import {AuthService, ErrorCode} from '@genezio/auth';

const Signup: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    try {
      // Register the user with the email and password
      const response = await AuthService.getInstance().register(email, password, name);
      console.log('Register Success', response);

      navigate('/login');
    } catch (error: any) {
      console.log(error);
      if (error.code === ErrorCode.EMAIL_ALREADY_EXISTS) {
        alert("Email already exists")
      } else if (error.code === ErrorCode.PASSWORD_CONTAINS_ONLY_NUMBER) {
        alert('Password contains only numbers');
      } else if (error.code === ErrorCode.PASSWORD_MUST_HAVE_AT_LEAST_ONE_SPECIAL_CHARACTER) {
        alert('Password must have at least one special character');
      } else if (error.code === ErrorCode.PASSWORD_MUST_HAVE_AT_LEAST_ONE_UPPERCASE_LETTER) {
        alert('Password must have at least one uppercase letter');
      } else if (error.code === ErrorCode.PASSWORD_TOO_SHORT) {
        alert('Password too short');
      } else {
        alert("An error has occurred")
      }
    }
    setLoading(false);
  };

  return (
    <>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="name">Name:</label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={e => setName(e.target.value)}/>
        </div>
        <div>
          <label htmlFor="email">Email:</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={e => setEmail(e.target.value)}/>
        </div>
        <div>
          <label htmlFor="password">Password:</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={e => setPassword(e.target.value)}/>
        </div>
        <button type="submit">{loading ? "Loading..." : "Sign Up"}</button>
        <button onClick={() => navigate('/login')}>Go to login</button>
      </form>
    </>
  )
    ;
};

export default Signup;
