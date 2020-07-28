const SimpleMVC = require('../../src/simplemvc.js');
const moment = require('moment');
const bcrypt = require('bcrypt');

const posts = [
    {
        slug: "hello-world",
        title: "Hello World",
        subtitle: "My First Post",
        date: "2020-07-25T09:58:00.000",
        content: "<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer ornare venenatis felis, sed molestie turpis sagittis ut. In metus eros, porttitor ac eros vitae, sodales commodo est. Sed sit amet eleifend dolor, et facilisis leo. Etiam malesuada augue nec lacus pharetra, non laoreet purus aliquet. Quisque tempus finibus faucibus. Proin gravida tincidunt blandit. Mauris id tincidunt mi. Proin sed nisl nisi. Proin eget dignissim metus. Aliquam ornare dolor et enim laoreet, non tristique augue sollicitudin. Vestibulum massa nisi, sollicitudin quis leo quis, porttitor aliquam est. Donec dignissim elementum odio, efficitur convallis tortor. Nam pharetra fermentum elit.</p><p>Aenean iaculis mi neque, nec iaculis eros viverra quis. Aliquam aliquet urna quis dui gravida suscipit. Interdum et malesuada fames ac ante ipsum primis in faucibus. Etiam posuere tortor et nisi fringilla suscipit. Nunc vitae rutrum libero, at congue enim. Duis efficitur, lectus nec semper dapibus, sapien leo varius elit, quis rhoncus libero felis eget justo. Praesent in dolor ipsum. Aliquam efficitur aliquet tellus, at semper dolor semper vitae. Vivamus metus nibh, feugiat sit amet cursus quis, ultrices sed metus. Praesent dictum velit nec massa pharetra placerat. Phasellus interdum, lacus vitae ultricies mattis, enim mauris pulvinar ex, in mattis velit leo eget enim. Sed quis augue sit amet leo fringilla tempus vitae et tellus.</p><p>Nulla tempus pulvinar maximus. Nullam rutrum ante eu tincidunt sollicitudin. Proin pulvinar nibh nisi. Phasellus iaculis odio quis purus interdum, vel vulputate eros vehicula. Sed vitae orci a eros facilisis pellentesque. Nunc eget mauris luctus est consequat lacinia. Ut blandit, mauris nec laoreet scelerisque, libero odio placerat diam, sit amet fringilla nibh diam quis nisi. Nullam pulvinar mauris nisi, id tincidunt erat eleifend pharetra. Fusce non dolor ut quam mattis varius ac at dolor. Sed sapien nibh, sollicitudin in lacinia non, maximus sed mauris. Donec sollicitudin fringilla nulla, nec volutpat est. Donec eu arcu cursus, consectetur purus sed, lobortis velit. Ut posuere viverra tellus, vel pulvinar tortor elementum aliquet.</p><p>Praesent vitae enim et neque accumsan blandit. Vivamus lectus enim, tincidunt eget varius quis, lobortis a sapien. Sed ligula nunc, pellentesque eget est at, pretium tincidunt diam. Pellentesque facilisis ipsum nibh, a rhoncus urna semper vel. Mauris a elit massa. In porta pellentesque condimentum. Donec tristique semper justo, vitae vestibulum nibh sagittis et. Nulla facilisis nibh erat, id molestie eros sollicitudin sed. In varius orci odio, ut mollis purus suscipit nec. Sed in lacus lobortis, varius nibh quis, consectetur dui.</p><p>Nam orci elit, hendrerit id bibendum ut, pretium eu urna. Vestibulum nisi augue, pretium eu auctor in, placerat porta nunc. Nunc a pulvinar sapien, eget efficitur sem. Morbi commodo dui ac dolor porttitor ornare. Nunc ligula arcu, egestas ut euismod ut, vulputate eget ex. Ut velit massa, gravida ut ornare et, ornare id lorem. Nunc varius quam augue, id bibendum sem malesuada nec.</p>",
        author: { slug: "jqpublic", name: "John Q. Public" }
    },
    {
        slug: "second-post",
        title: "Second Post",
        subtitle: "My Second Post. Is it as good as the first?",
        date: "2020-07-25T11:19:00.000",
        content: "<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer ornare venenatis felis, sed molestie turpis sagittis ut. In metus eros, porttitor ac eros vitae, sodales commodo est. Sed sit amet eleifend dolor, et facilisis leo. Etiam malesuada augue nec lacus pharetra, non laoreet purus aliquet. Quisque tempus finibus faucibus. Proin gravida tincidunt blandit. Mauris id tincidunt mi. Proin sed nisl nisi. Proin eget dignissim metus. Aliquam ornare dolor et enim laoreet, non tristique augue sollicitudin. Vestibulum massa nisi, sollicitudin quis leo quis, porttitor aliquam est. Donec dignissim elementum odio, efficitur convallis tortor. Nam pharetra fermentum elit.</p><p>Aenean iaculis mi neque, nec iaculis eros viverra quis. Aliquam aliquet urna quis dui gravida suscipit. Interdum et malesuada fames ac ante ipsum primis in faucibus. Etiam posuere tortor et nisi fringilla suscipit. Nunc vitae rutrum libero, at congue enim. Duis efficitur, lectus nec semper dapibus, sapien leo varius elit, quis rhoncus libero felis eget justo. Praesent in dolor ipsum. Aliquam efficitur aliquet tellus, at semper dolor semper vitae. Vivamus metus nibh, feugiat sit amet cursus quis, ultrices sed metus. Praesent dictum velit nec massa pharetra placerat. Phasellus interdum, lacus vitae ultricies mattis, enim mauris pulvinar ex, in mattis velit leo eget enim. Sed quis augue sit amet leo fringilla tempus vitae et tellus.</p><p>Nulla tempus pulvinar maximus. Nullam rutrum ante eu tincidunt sollicitudin. Proin pulvinar nibh nisi. Phasellus iaculis odio quis purus interdum, vel vulputate eros vehicula. Sed vitae orci a eros facilisis pellentesque. Nunc eget mauris luctus est consequat lacinia. Ut blandit, mauris nec laoreet scelerisque, libero odio placerat diam, sit amet fringilla nibh diam quis nisi. Nullam pulvinar mauris nisi, id tincidunt erat eleifend pharetra. Fusce non dolor ut quam mattis varius ac at dolor. Sed sapien nibh, sollicitudin in lacinia non, maximus sed mauris. Donec sollicitudin fringilla nulla, nec volutpat est. Donec eu arcu cursus, consectetur purus sed, lobortis velit. Ut posuere viverra tellus, vel pulvinar tortor elementum aliquet.</p><p>Praesent vitae enim et neque accumsan blandit. Vivamus lectus enim, tincidunt eget varius quis, lobortis a sapien. Sed ligula nunc, pellentesque eget est at, pretium tincidunt diam. Pellentesque facilisis ipsum nibh, a rhoncus urna semper vel. Mauris a elit massa. In porta pellentesque condimentum. Donec tristique semper justo, vitae vestibulum nibh sagittis et. Nulla facilisis nibh erat, id molestie eros sollicitudin sed. In varius orci odio, ut mollis purus suscipit nec. Sed in lacus lobortis, varius nibh quis, consectetur dui.</p><p>Nam orci elit, hendrerit id bibendum ut, pretium eu urna. Vestibulum nisi augue, pretium eu auctor in, placerat porta nunc. Nunc a pulvinar sapien, eget efficitur sem. Morbi commodo dui ac dolor porttitor ornare. Nunc ligula arcu, egestas ut euismod ut, vulputate eget ex. Ut velit massa, gravida ut ornare et, ornare id lorem. Nunc varius quam augue, id bibendum sem malesuada nec.</p>",
        author: { slug: "jqpublic", name: "John Q. Public" }
    },
    {
        slug: "a-guest-post",
        title: "A Guest Post",
        subtitle: "A guest post from my dear friend Jane",
        date: "2020-07-25T11:32:00.000",
        content: "<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer ornare venenatis felis, sed molestie turpis sagittis ut. In metus eros, porttitor ac eros vitae, sodales commodo est. Sed sit amet eleifend dolor, et facilisis leo. Etiam malesuada augue nec lacus pharetra, non laoreet purus aliquet. Quisque tempus finibus faucibus. Proin gravida tincidunt blandit. Mauris id tincidunt mi. Proin sed nisl nisi. Proin eget dignissim metus. Aliquam ornare dolor et enim laoreet, non tristique augue sollicitudin. Vestibulum massa nisi, sollicitudin quis leo quis, porttitor aliquam est. Donec dignissim elementum odio, efficitur convallis tortor. Nam pharetra fermentum elit.</p><p>Aenean iaculis mi neque, nec iaculis eros viverra quis. Aliquam aliquet urna quis dui gravida suscipit. Interdum et malesuada fames ac ante ipsum primis in faucibus. Etiam posuere tortor et nisi fringilla suscipit. Nunc vitae rutrum libero, at congue enim. Duis efficitur, lectus nec semper dapibus, sapien leo varius elit, quis rhoncus libero felis eget justo. Praesent in dolor ipsum. Aliquam efficitur aliquet tellus, at semper dolor semper vitae. Vivamus metus nibh, feugiat sit amet cursus quis, ultrices sed metus. Praesent dictum velit nec massa pharetra placerat. Phasellus interdum, lacus vitae ultricies mattis, enim mauris pulvinar ex, in mattis velit leo eget enim. Sed quis augue sit amet leo fringilla tempus vitae et tellus.</p><p>Nulla tempus pulvinar maximus. Nullam rutrum ante eu tincidunt sollicitudin. Proin pulvinar nibh nisi. Phasellus iaculis odio quis purus interdum, vel vulputate eros vehicula. Sed vitae orci a eros facilisis pellentesque. Nunc eget mauris luctus est consequat lacinia. Ut blandit, mauris nec laoreet scelerisque, libero odio placerat diam, sit amet fringilla nibh diam quis nisi. Nullam pulvinar mauris nisi, id tincidunt erat eleifend pharetra. Fusce non dolor ut quam mattis varius ac at dolor. Sed sapien nibh, sollicitudin in lacinia non, maximus sed mauris. Donec sollicitudin fringilla nulla, nec volutpat est. Donec eu arcu cursus, consectetur purus sed, lobortis velit. Ut posuere viverra tellus, vel pulvinar tortor elementum aliquet.</p><p>Praesent vitae enim et neque accumsan blandit. Vivamus lectus enim, tincidunt eget varius quis, lobortis a sapien. Sed ligula nunc, pellentesque eget est at, pretium tincidunt diam. Pellentesque facilisis ipsum nibh, a rhoncus urna semper vel. Mauris a elit massa. In porta pellentesque condimentum. Donec tristique semper justo, vitae vestibulum nibh sagittis et. Nulla facilisis nibh erat, id molestie eros sollicitudin sed. In varius orci odio, ut mollis purus suscipit nec. Sed in lacus lobortis, varius nibh quis, consectetur dui.</p><p>Nam orci elit, hendrerit id bibendum ut, pretium eu urna. Vestibulum nisi augue, pretium eu auctor in, placerat porta nunc. Nunc a pulvinar sapien, eget efficitur sem. Morbi commodo dui ac dolor porttitor ornare. Nunc ligula arcu, egestas ut euismod ut, vulputate eget ex. Ut velit massa, gravida ut ornare et, ornare id lorem. Nunc varius quam augue, id bibendum sem malesuada nec.</p>",
        author: { slug: "jane-taxpayer", name: "Jane Taxpayer" }
    }
];

const sortByDateDesc = (a, b) => {
    const dtA = new Date(a.date);
    const dtB = new Date(b.date);

    return dtA > dtB ? -1 : dtA < dtB ? 1 : 0;
}

const blogController = new SimpleMVC.Controller("/", {
    "": {
        get: function () {
            const recentPosts = posts.sort(sortByDateDesc);
            recentPosts.forEach(p => p.date_formatted = moment(p.date).format('MMMM Do YYYY hh:mm a'));
            return this.view('index', { posts: recentPosts, title: "My Blog" });
        }
    },
    "post/:id": function (req) {
        const post = posts.filter(p => p.slug === req.params.id)[0];
        post.date_formatted = moment(post.date).format('MMMM Do YYYY hh:mm a');
        return this.view('single', post);
    },
    "author/:id": function (req) {
        const authorPosts = posts
            .filter(p => p.author.slug === req.params.id)
            .sort(sortByDateDesc);
        authorPosts.forEach(p => p.date_formatted == moment(p.date).format('MMMM Do YYYY hh:mm a'));
        return this.view('index', { posts: authorPosts, title: authorPosts[0].author.name });
    },
    "about": function () {
        return this.view('about', { title: "About Me" });
    },
    "contact": {
        get: function () {
            return this.view('contact', { title: "Contact Me" });
        },
        post: async function (req) {
            const { name, email, phone, message } = req.fields;
            const smtp = new SimpleMVC.SMTP();
            const result = await smtp.sendMail(`"${name}" <${email}>`, "godfrey.gleason44@ethereal.email", "New Contact", "From:{{name}} - {{email}}<br><br>Message:<br>{{message}}<br><br>Phone: {{phone}}", { name, email, phone, message });
            return this.view('contact', { message: { type: 'success', message: "Your message has been sent!" }, title: "Contact Me" });
        }
    },
});

const authController = new SimpleMVC.Controller("/auth/", {
    "": {
        get: function () {
            return this.view('login', { title: "Login" });
        },
        post: async function (req) {
            if (await bcrypt.compare(req.fields.password, process.env.ADMIN_PASSWORD)) {
                console.log("post compared");
                return this.redirect('/admin');
            }
            return this.view('login', { err: "WRONG PASSWORD BOY-O   " + (await bcrypt.hash(req.fields.password, 10)) });
        }
    }
})
authController.beforeRoute = function (req) {
    if (req.session.admin)
        return this.redirect('/admin');
}

const adminController = new SimpleMVC.Controller("/admin/", {

});
adminController.beforeRoute = function(req) {
    if(!req.session.isAdmin)
        return this.redirect('/auth');
};

const app = new SimpleMVC.App();
app.initSessions();
app.addControllers(blogController, authController);
app.initStaticFiles('/static');
app.listen();