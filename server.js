import "dotenv/config";
import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const app = express();
app.use(express.json());

const users = [];

const alunos = [
    { id: 1, nome: "Asdrubal", ra: "11111", nota1: 8.5, nota2: 9.5 },
    { id: 2, nome: "Lupita",   ra: "22222", nota1: 7.5, nota2: 7   },
    { id: 3, nome: "Zoroastro", ra: "33333", nota1: 3,   nota2: 4  },
];

app.listen(3000, () => {
    console.log("Servidor ativo e aguardando requisições...");
});

const authenticateJWT = (req, res, next) => {

    const authHeader = req.header('Authorization');
    console.log('Authorization: ' + authHeader);

    let token;
     
    if(authHeader) {
        const parts = authHeader.split(' ');
        if(parts.length === 2) {
            token = parts[1];
        }
    }

    if(!token) {
        return res.status(401).json({ message : "Acesso negado! Token não fornecido." });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {

        if(err) {
            if(err.name === 'TokenExpiredError') {
                return res.status(401).json({ message : "Acesso negado. Token expirado."})
            } else if (err.name === 'JsonWebTokenError') {
                return res.status(403).json({ message : "Acesso negado. Token inválido." });
            } else {
                return res.status(403).json({ message : "Acesso negado. Erro na verificação do token." });
            }   
        }

        req.user = user;

        const issuedAtISO = new Date(user.iat * 1000).toISOString();
        const expiresAtISO = new Date(user.exp * 1000).toISOString();

        console.log(`Token validado para o usuário: ${user.username}
            Emitido em: ${issuedAtISO}
            Expira em: ${expiresAtISO}
        `)

        next();
    })
}

app.use('/alunos', authenticateJWT);

app.post('/register', async(req,res) => {

    const {username, password} = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);

    users.push( {username, password : hashedPassword });
    console.log(users);

    res.status(201).json({ message: "Usuário criado!" });

});

app.post('/login', async(req,res) => {

    const {username, password} = req.body;

    const user = users.find( user => user.username === username );

    if ( !user || !( await bcrypt.compare(password, user.password) ) ) {
        return res.status(401).json({ message : "Login Incorreto!"});
    }

    const token = jwt.sign(
        { username : user.username },
        process.env.JWT_SECRET,
        { expiresIn: '1h', algorithm: 'HS256' }
    );

    res.json({ 
        token : token 
    });

});

app.post('/alunos', async(req,res) => {

    const {id, nome, ra, nota1, nota2} = req.body;

    alunos.push({id, nome, ra, nota1, nota2});

    res.status(201).json({message : 'Aluno criado com sucesso!'});
});

app.get('/alunos/medias', async(req,res) => {
    const medias = alunos.map(aluno => ({
        nome: aluno.nome,
        media: (aluno.nota1 + aluno.nota2) / 2
    }));

    res.json(medias);
})

app.get('/alunos/aprovados', async(req,res) => {
    const status = alunos.map(aluno => {
        const media = (aluno.nota1 + aluno.nota2) / 2;
        return {
            nome : aluno.nome,
            status : media >= 6 ? "aprovado" : "reprovado"
        };
    });

    res.json(status);
})

app.get('/alunos', async(req,res) => {
    res.json(alunos);
})

app.put('/alunos/:id', async(req, res) => {
    const aluno = alunos.find(a => a.id === parseInt(req.params.id));

    if(!aluno) {
        return res.status(404).json({ message : "Aluno não encontrado!" });
    }

    const { nome, ra, nota1, nota2} = req.body;

    aluno.nome = nome;
    aluno.ra = ra;
    aluno.nota1 = nota1;
    aluno.nota2 = nota2;

    res.json(aluno);
})

app.get('/alunos/:id', async(req, res) => {

    const aluno = alunos.find(a => a.id === parseInt(req.params.id));

    if(!aluno) {
        return res.status(404).json({ message : "Aluno não encontrado!"});
    }

    res.json(aluno);
})

app.delete('/alunos/:id', async(req,res) => {
    const index = alunos.findIndex(a => a.id === parseInt(req.params.id))

    if(index === -1) {
        return res.status(404).json({ message : "Aluno não encontrado!"});
    }

    alunos.splice(index, 1);

    res.json({ message : "Aluno deletado com sucesso" });
})