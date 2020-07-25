# Examples / SimpleBlog
This example shows you the most basic blog imaginable, the posts are in an array, but there is no reason you couldn't load them out of mongoose.
### Getting it to work
You will need to create a `dotenv` file. You can do this by running `touch .env`. You then need to add and fill out at least the following lines:
```ini
HOST=
PORT=
SMTP_USER=
SMTP_PASS=
SMTP_HOST=
SMTP_PORT=
SMTP_SECURE=
```
After that, just running `npm start` should be all that is required to get this blog up and running.