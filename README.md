<div align="center"> <a href="https://genezio.com/">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://github.com/genez-io/graphics/raw/HEAD/svg/Icon_Genezio_White.svg">
    <source media="(prefers-color-scheme: light)" srcset="https://github.com/genez-io/graphics/raw/HEAD/svg/Icon_Genezio_Black.svg">
    <img alt="genezio logo" src="https://github.com/genez-io/graphics/raw/HEAD/svg/Icon_Genezio_Black.svg" height="100" >
  </picture>
</a>
 </div>

<div align="center">

[![Join our community](https://img.shields.io/discord/1024296197575422022?style=social&label=Join%20our%20community%20&logo=discord&labelColor=6A7EC2)](https://discord.gg/uc9H5YKjXv)
[![Follow @geneziodev](https://img.shields.io/twitter/url/https/twitter.com/geneziodev.svg?style=social&label=Follow%20%40geneziodev)](https://twitter.com/geneziodev)

</div>

# Express Auth Starter

This is a React starter kit that uses Genezio Auth for simple Email and Password login, and a Mongo database to persist the data.

## Features 

- Email + password login
- Mongo database
- IAC (Infrastructure as Code) with Genezio
- Deploy to Genezio with one click

This project have the following routes:

- `/` - Secret page that requires authentication
- `/login` - Login page with email + password and Google login
- `/signUp` - Signup page with email + password and Google login
- `/forget-password` - Forgot password page
- `/reset` - Reset password page


This project used Genezio IAC (Infrastructure as Code) to create the following resources:
- A Mongo database
- A Genezio Auth instance
- A fullstack project with the React frontend and the Express backend

To deploy this project to Genezio, you need to run the following command:

```bash
genezio deploy
```

if you don't have the Genezio CLI installed, you can install it with:

```bash
npm install -g genezio
```

or you can deploy the project to Genezio with one click:

[![Deploy to Genezio](https://raw.githubusercontent.com/Genez-io/graphics/main/svg/deploy-button.svg)](https://app.genez.io/start/deploy?repository=https://github.com/Genez-io/express-mongo-auth-starter)

## Genezio CLI Commands

Genezio also provides a CLI tool that you can use to deploy your project from your machine.
All commands are run from the root of the project, from a terminal:

| Command                  | Action                       |
|:-------------------------|:-----------------------------|
| `npm install -g genezio` | Installs genezio globally    |
| `genezio login`          | Logs in to genezio           |
| `genezio local`          | Starts a local server        |
| `genezio deploy`         | Deploys a production project |
| `genezio --help`         | Get help using genezio       |

## Learn more

To learn more about Genezio, take a look at the following resources:

- [Official genezio documentation](https://genezio.com/docs)
- [Tutorials](https://genezio.com/blog)

## Contact

If you need support, or you have any questions, please join us in our [Discord channel](https://discord.gg/uc9H5YKjXv).
We'd love to chat!

## Built With

- [Genezio](https://genezio.com/)
- [Node.JS](https://nodejs.org/en/)
- [Vite](https://vitejs.dev/)
- [Express](https://expressjs.com/)
- [MongoDB](https://www.mongodb.com/)

***

<div align="center"> <a href="https://genezio.com/">
  <p>Built with Genezio with ❤️ </p>
  <img alt="genezio logo" src="https://raw.githubusercontent.com/Genez-io/graphics/main/svg/powered_by_genezio.svg" height="40"></a>
</div>
