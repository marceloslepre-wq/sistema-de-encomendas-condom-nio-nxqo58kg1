import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Package } from 'lucide-react'
import { Progress } from '@/components/ui/progress'

export default function Cadastro() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-neutralBg">
      <Card className="w-full max-w-lg animate-slide-up">
        <CardHeader className="text-center">
          <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center mx-auto mb-2 text-white">
            <Package className="h-6 w-6" />
          </div>
          <CardTitle className="text-xl font-bold">Completar Cadastro</CardTitle>
          <CardDescription>Você foi convidado para a Torre A, Apto 101</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Torre</Label>
              <Input disabled value="A" />
            </div>
            <div className="space-y-2">
              <Label>Apartamento</Label>
              <Input disabled value="101" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Nome Completo</Label>
            <Input id="name" placeholder="Ex: João da Silva" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cpf">CPF</Label>
              <Input id="cpf" placeholder="000.000.000-00" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Celular</Label>
              <Input id="phone" placeholder="(00) 00000-0000" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" placeholder="joao@exemplo.com" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Criar Senha</Label>
            <Input id="password" type="password" />
            <div className="flex items-center gap-2 mt-1">
              <Progress value={66} className="h-1.5" />
              <span className="text-[10px] text-muted-foreground w-12 text-right">Média</span>
            </div>
          </div>

          <Button className="w-full mt-6" asChild>
            <Link to="/">Finalizar Cadastro</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
