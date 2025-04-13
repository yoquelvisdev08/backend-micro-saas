import requests
import json
import time
import datetime
import os
from pprint import pformat

class ApiTester:
    def __init__(self, base_url="https://web-production-8d975.up.railway.app"):
        self.base_url = base_url
        self.token = None
        self.user_id = None
        self.site_id = None
        self.results = {
            "timestamp": datetime.datetime.now().isoformat(),
            "tests": []
        }
        self.email = f"test_{int(time.time())}@example.com"  # Email único para cada ejecución
        self.password = "Test123456!"

    def add_result(self, endpoint, method, payload=None, response=None, success=True, notes=None):
        result = {
            "endpoint": endpoint,
            "method": method,
            "timestamp": datetime.datetime.now().isoformat(),
            "success": success,
            "payload": payload
        }
        
        if response:
            if isinstance(response, requests.Response):
                try:
                    result["response"] = response.json()
                except:
                    result["response"] = {"text": response.text, "status_code": response.status_code}
                result["status_code"] = response.status_code
            else:
                result["response"] = response
        
        if notes:
            result["notes"] = notes
            
        self.results["tests"].append(result)
        return result

    def get_headers(self):
        headers = {"Content-Type": "application/json"}
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"
        return headers

    def register_user(self):
        print("1. Registrando nuevo usuario...")
        endpoint = "/api/auth/register"
        payload = {
            "name": "Test User",
            "email": self.email,
            "password": self.password
        }
        
        response = requests.post(
            f"{self.base_url}{endpoint}", 
            headers={"Content-Type": "application/json"},
            json=payload
        )
        
        result = self.add_result(endpoint, "POST", payload, response)
        
        if response.status_code == 201:
            data = response.json()
            self.token = data.get("data", {}).get("token")
            self.user_id = data.get("data", {}).get("user", {}).get("id")
            print(f"  ✅ Usuario registrado exitosamente (ID: {self.user_id})")
        else:
            print(f"  ❌ Error al registrar usuario: {response.status_code}")
            print(f"  Respuesta: {response.text}")
        
        return result

    def login(self):
        print("2. Iniciando sesión...")
        endpoint = "/api/auth/login"
        payload = {
            "email": self.email,
            "password": self.password
        }
        
        response = requests.post(
            f"{self.base_url}{endpoint}", 
            headers={"Content-Type": "application/json"},
            json=payload
        )
        
        result = self.add_result(endpoint, "POST", payload, response)
        
        if response.status_code == 200:
            data = response.json()
            self.token = data.get("data", {}).get("token")
            print("  ✅ Inicio de sesión exitoso")
        else:
            print(f"  ❌ Error al iniciar sesión: {response.status_code}")
            print(f"  Respuesta: {response.text}")
        
        return result

    def get_profile(self):
        print("3. Obteniendo perfil de usuario...")
        endpoint = "/api/auth/me"
        
        response = requests.get(
            f"{self.base_url}{endpoint}",
            headers=self.get_headers()
        )
        
        result = self.add_result(endpoint, "GET", None, response)
        
        if response.status_code == 200:
            print("  ✅ Perfil obtenido exitosamente")
        else:
            print(f"  ❌ Error al obtener perfil: {response.status_code}")
        
        return result

    def create_site(self, url="https://portafolio-six-sigma-45.vercel.app"):
        print(f"4. Creando nuevo sitio para monitorear ({url})...")
        endpoint = "/api/sites"
        payload = {
            "name": "Portfolio Testing Site",
            "url": url
        }
        
        response = requests.post(
            f"{self.base_url}{endpoint}",
            headers=self.get_headers(),
            json=payload
        )
        
        result = self.add_result(endpoint, "POST", payload, response)
        
        if response.status_code == 201:
            data = response.json()
            self.site_id = data.get("data", {}).get("site", {}).get("id")
            print(f"  ✅ Sitio creado exitosamente (ID: {self.site_id})")
        else:
            print(f"  ❌ Error al crear sitio: {response.status_code}")
            print(f"  Respuesta: {response.text}")
        
        return result

    def get_sites(self):
        print("5. Obteniendo lista de sitios...")
        endpoint = "/api/sites"
        
        response = requests.get(
            f"{self.base_url}{endpoint}",
            headers=self.get_headers()
        )
        
        result = self.add_result(endpoint, "GET", None, response)
        
        if response.status_code == 200:
            sites_count = len(response.json().get("data", {}).get("sites", []))
            print(f"  ✅ Lista de sitios obtenida ({sites_count} sitios)")
        else:
            print(f"  ❌ Error al obtener sitios: {response.status_code}")
        
        return result

    def get_site_detail(self):
        if not self.site_id:
            print("  ⚠️ No hay sitio creado para obtener detalles")
            return None
            
        print(f"6. Obteniendo detalles del sitio (ID: {self.site_id})...")
        endpoint = f"/api/sites/{self.site_id}"
        
        response = requests.get(
            f"{self.base_url}{endpoint}",
            headers=self.get_headers()
        )
        
        result = self.add_result(endpoint, "GET", None, response)
        
        if response.status_code == 200:
            print("  ✅ Detalles del sitio obtenidos")
        else:
            print(f"  ❌ Error al obtener detalles: {response.status_code}")
        
        return result

    def update_site(self):
        if not self.site_id:
            print("  ⚠️ No hay sitio creado para actualizar")
            return None
            
        print(f"7. Actualizando sitio (ID: {self.site_id})...")
        endpoint = f"/api/sites/{self.site_id}"
        payload = {
            "name": "Portfolio Testing Site (Updated)",
            "url": "https://portafolio-six-sigma-45.vercel.app"
        }
        
        response = requests.put(
            f"{self.base_url}{endpoint}",
            headers=self.get_headers(),
            json=payload
        )
        
        result = self.add_result(endpoint, "PUT", payload, response)
        
        if response.status_code == 200:
            print("  ✅ Sitio actualizado exitosamente")
        else:
            print(f"  ❌ Error al actualizar sitio: {response.status_code}")
        
        return result

    def get_logs(self):
        print("8. Obteniendo logs de actividad...")
        endpoint = "/api/logs"
        
        response = requests.get(
            f"{self.base_url}{endpoint}",
            headers=self.get_headers()
        )
        
        result = self.add_result(endpoint, "GET", None, response)
        
        if response.status_code == 200:
            logs_count = len(response.json().get("data", {}).get("logs", []))
            print(f"  ✅ Logs obtenidos exitosamente ({logs_count} logs)")
        else:
            print(f"  ❌ Error al obtener logs: {response.status_code}")
        
        return result

    def get_stats(self):
        print("9. Obteniendo estadísticas generales...")
        endpoint = "/api/stats"
        
        response = requests.get(
            f"{self.base_url}{endpoint}",
            headers=self.get_headers()
        )
        
        result = self.add_result(endpoint, "GET", None, response)
        
        if response.status_code == 200:
            print("  ✅ Estadísticas obtenidas exitosamente")
        else:
            print(f"  ❌ Error al obtener estadísticas: {response.status_code}")
        
        return result

    def get_user_stats(self):
        print("10. Obteniendo estadísticas de usuario...")
        endpoint = "/api/stats/user"
        
        response = requests.get(
            f"{self.base_url}{endpoint}",
            headers=self.get_headers()
        )
        
        result = self.add_result(endpoint, "GET", None, response)
        
        if response.status_code == 200:
            print("  ✅ Estadísticas de usuario obtenidas exitosamente")
        else:
            print(f"  ❌ Error al obtener estadísticas de usuario: {response.status_code}")
        
        return result

    def get_activity_distribution(self):
        print("11. Obteniendo distribución de actividad...")
        endpoint = "/api/stats/activity"
        
        response = requests.get(
            f"{self.base_url}{endpoint}",
            headers=self.get_headers()
        )
        
        result = self.add_result(endpoint, "GET", None, response)
        
        if response.status_code == 200:
            print("  ✅ Distribución de actividad obtenida exitosamente")
        else:
            print(f"  ❌ Error al obtener distribución: {response.status_code}")
        
        return result
        
    # MONITOR TESTS
    
    def run_site_monitor_check(self):
        if not self.site_id:
            print("  ⚠️ No hay sitio creado para monitorear")
            return None
            
        print(f"12. Ejecutando verificación de monitoreo completa para el sitio...")
        endpoint = f"/api/sites/{self.site_id}/monitor"
        
        response = requests.post(
            f"{self.base_url}{endpoint}",
            headers=self.get_headers()
        )
        
        result = self.add_result(endpoint, "POST", None, response)
        
        if response.status_code == 200:
            print("  ✅ Verificación de monitoreo ejecutada exitosamente")
        else:
            print(f"  ❌ Error al ejecutar verificación de monitoreo: {response.status_code}")
        
        return result
        
    def run_site_basic_check(self):
        if not self.site_id:
            print("  ⚠️ No hay sitio creado para verificar")
            return None
            
        print(f"13. Ejecutando verificación básica del sitio...")
        endpoint = f"/api/sites/{self.site_id}/check"
        
        response = requests.get(
            f"{self.base_url}{endpoint}",
            headers=self.get_headers()
        )
        
        result = self.add_result(endpoint, "GET", None, response)
        
        if response.status_code == 200:
            print("  ✅ Verificación básica ejecutada exitosamente")
        else:
            print(f"  ❌ Error al ejecutar verificación básica: {response.status_code}")
        
        return result
        
    def run_site_ssl_check(self):
        if not self.site_id:
            print("  ⚠️ No hay sitio creado para verificar SSL")
            return None
            
        print(f"14. Ejecutando verificación SSL del sitio...")
        endpoint = f"/api/sites/{self.site_id}/ssl"
        
        response = requests.get(
            f"{self.base_url}{endpoint}",
            headers=self.get_headers()
        )
        
        result = self.add_result(endpoint, "GET", None, response)
        
        if response.status_code == 200:
            print("  ✅ Verificación SSL ejecutada exitosamente")
        else:
            print(f"  ❌ Error al ejecutar verificación SSL: {response.status_code}")
        
        return result
        
    def run_site_performance_check(self):
        if not self.site_id:
            print("  ⚠️ No hay sitio creado para analizar rendimiento")
            return None
            
        print(f"15. Ejecutando análisis de rendimiento del sitio...")
        endpoint = f"/api/sites/{self.site_id}/performance"
        
        response = requests.get(
            f"{self.base_url}{endpoint}",
            headers=self.get_headers()
        )
        
        result = self.add_result(endpoint, "GET", None, response)
        
        if response.status_code == 200:
            print("  ✅ Análisis de rendimiento ejecutado exitosamente")
        else:
            print(f"  ❌ Error al ejecutar análisis de rendimiento: {response.status_code}")
        
        return result
        
    def run_site_keyword_check(self):
        if not self.site_id:
            print("  ⚠️ No hay sitio creado para analizar palabras clave")
            return None
            
        print(f"16. Ejecutando análisis de palabras clave del sitio...")
        endpoint = f"/api/sites/{self.site_id}/keywords"
        
        response = requests.get(
            f"{self.base_url}{endpoint}",
            headers=self.get_headers()
        )
        
        result = self.add_result(endpoint, "GET", None, response)
        
        if response.status_code == 200:
            print("  ✅ Análisis de palabras clave ejecutado exitosamente")
        else:
            print(f"  ❌ Error al ejecutar análisis de palabras clave: {response.status_code}")
        
        return result
        
    def run_site_hotspots_check(self):
        if not self.site_id:
            print("  ⚠️ No hay sitio creado para identificar puntos críticos")
            return None
            
        print(f"17. Identificando puntos críticos del sitio...")
        endpoint = f"/api/sites/{self.site_id}/hotspots"
        
        response = requests.get(
            f"{self.base_url}{endpoint}",
            headers=self.get_headers()
        )
        
        result = self.add_result(endpoint, "GET", None, response)
        
        if response.status_code == 200:
            print("  ✅ Identificación de puntos críticos ejecutada exitosamente")
        else:
            print(f"  ❌ Error al identificar puntos críticos: {response.status_code}")
        
        return result
        
    def get_site_monitor_history(self):
        if not self.site_id:
            print("  ⚠️ No hay sitio creado para obtener historial")
            return None
            
        print(f"18. Obteniendo historial de monitoreo del sitio...")
        endpoint = f"/api/sites/{self.site_id}/history"
        
        response = requests.get(
            f"{self.base_url}{endpoint}",
            headers=self.get_headers()
        )
        
        result = self.add_result(endpoint, "GET", None, response)
        
        if response.status_code == 200:
            print("  ✅ Historial de monitoreo obtenido exitosamente")
        else:
            print(f"  ❌ Error al obtener historial de monitoreo: {response.status_code}")
        
        return result
        
    def update_monitor_settings(self):
        if not self.site_id:
            print("  ⚠️ No hay sitio creado para actualizar configuración")
            return None
            
        print(f"19. Actualizando configuración de monitoreo del sitio...")
        endpoint = f"/api/monitor/site/{self.site_id}/settings"
        payload = {
            "checkFrequency": "daily",
            "enableAlerts": True,
            "checkPerformance": True,
            "checkKeywords": True,
            "alertThreshold": 2000
        }
        
        response = requests.put(
            f"{self.base_url}{endpoint}",
            headers=self.get_headers(),
            json=payload
        )
        
        result = self.add_result(endpoint, "PUT", payload, response)
        
        if response.status_code == 200:
            print("  ✅ Configuración de monitoreo actualizada exitosamente")
        else:
            print(f"  ❌ Error al actualizar configuración de monitoreo: {response.status_code}")
        
        return result

    def run_monitor_basic_check(self):
        if not self.site_id:
            print("  ⚠️ No hay sitio creado para verificar")
            return None
            
        print(f"20. Ejecutando verificación básica mediante el monitor...")
        endpoint = f"/api/monitor/site/{self.site_id}/basic"
        
        response = requests.get(
            f"{self.base_url}{endpoint}",
            headers=self.get_headers()
        )
        
        result = self.add_result(endpoint, "GET", None, response)
        
        if response.status_code == 200:
            print("  ✅ Verificación básica mediante monitor ejecutada exitosamente")
        else:
            print(f"  ❌ Error al ejecutar verificación básica mediante monitor: {response.status_code}")
        
        return result

    def run_monitor_ssl_check(self):
        if not self.site_id:
            print("  ⚠️ No hay sitio creado para verificar SSL")
            return None
            
        print(f"21. Ejecutando verificación SSL mediante el monitor...")
        endpoint = f"/api/monitor/site/{self.site_id}/ssl"
        
        response = requests.get(
            f"{self.base_url}{endpoint}",
            headers=self.get_headers()
        )
        
        result = self.add_result(endpoint, "GET", None, response)
        
        if response.status_code == 200:
            print("  ✅ Verificación SSL mediante monitor ejecutada exitosamente")
        else:
            print(f"  ❌ Error al ejecutar verificación SSL mediante monitor: {response.status_code}")
        
        return result

    def run_monitor_performance_check(self):
        if not self.site_id:
            print("  ⚠️ No hay sitio creado para analizar rendimiento")
            return None
            
        print(f"22. Ejecutando análisis de rendimiento mediante el monitor...")
        endpoint = f"/api/monitor/site/{self.site_id}/performance"
        
        response = requests.get(
            f"{self.base_url}{endpoint}",
            headers=self.get_headers()
        )
        
        result = self.add_result(endpoint, "GET", None, response)
        
        if response.status_code == 200:
            print("  ✅ Análisis de rendimiento mediante monitor ejecutado exitosamente")
        else:
            print(f"  ❌ Error al ejecutar análisis de rendimiento mediante monitor: {response.status_code}")
        
        return result

    def run_monitor_keywords_check(self):
        if not self.site_id:
            print("  ⚠️ No hay sitio creado para analizar palabras clave")
            return None
            
        print(f"23. Ejecutando análisis de palabras clave mediante el monitor...")
        endpoint = f"/api/monitor/site/{self.site_id}/keywords"
        
        response = requests.get(
            f"{self.base_url}{endpoint}",
            headers=self.get_headers()
        )
        
        result = self.add_result(endpoint, "GET", None, response)
        
        if response.status_code == 200:
            print("  ✅ Análisis de palabras clave mediante monitor ejecutado exitosamente")
        else:
            print(f"  ❌ Error al ejecutar análisis de palabras clave mediante monitor: {response.status_code}")
        
        return result

    def run_monitor_hotspots_check(self):
        if not self.site_id:
            print("  ⚠️ No hay sitio creado para identificar puntos críticos")
            return None
            
        print(f"24. Identificando puntos críticos mediante el monitor...")
        endpoint = f"/api/monitor/site/{self.site_id}/hotspots"
        
        response = requests.get(
            f"{self.base_url}{endpoint}",
            headers=self.get_headers()
        )
        
        result = self.add_result(endpoint, "GET", None, response)
        
        if response.status_code == 200:
            print("  ✅ Identificación de puntos críticos mediante monitor ejecutada exitosamente")
        else:
            print(f"  ❌ Error al identificar puntos críticos mediante monitor: {response.status_code}")
        
        return result

    def run_monitor_full_check(self):
        if not self.site_id:
            print("  ⚠️ No hay sitio creado para ejecutar verificación completa")
            return None
            
        print(f"25. Ejecutando verificación completa mediante el monitor...")
        endpoint = f"/api/monitor/site/{self.site_id}/full"
        
        response = requests.get(
            f"{self.base_url}{endpoint}",
            headers=self.get_headers()
        )
        
        result = self.add_result(endpoint, "GET", None, response)
        
        if response.status_code == 200:
            print("  ✅ Verificación completa mediante monitor ejecutada exitosamente")
        else:
            print(f"  ❌ Error al ejecutar verificación completa mediante monitor: {response.status_code}")
        
        return result

    def get_monitor_history(self):
        if not self.site_id:
            print("  ⚠️ No hay sitio creado para obtener historial")
            return None
            
        print(f"26. Obteniendo historial mediante el monitor...")
        endpoint = f"/api/monitor/site/{self.site_id}/history"
        
        response = requests.get(
            f"{self.base_url}{endpoint}",
            headers=self.get_headers()
        )
        
        result = self.add_result(endpoint, "GET", None, response)
        
        if response.status_code == 200:
            print("  ✅ Historial mediante monitor obtenido exitosamente")
        else:
            print(f"  ❌ Error al obtener historial mediante monitor: {response.status_code}")
        
        return result

    def get_admin_monitor_overview(self):
        print(f"27. Obteniendo resumen de monitoreo para administrador...")
        endpoint = f"/api/monitor/admin/overview"
        
        response = requests.get(
            f"{self.base_url}{endpoint}",
            headers=self.get_headers()
        )
        
        result = self.add_result(endpoint, "GET", None, response)
        
        if response.status_code == 200:
            print("  ✅ Resumen de monitoreo para administrador obtenido exitosamente")
        else:
            print(f"  ❌ Error al obtener resumen de monitoreo para administrador: {response.status_code}")
        
        return result

    def generate_report(self, format="json"):
        print(f"\nGenerando reporte en formato {format.upper()}...")
        
        if format == "json":
            filename = f"api_test_report_{int(time.time())}.json"
            with open(filename, "w") as f:
                json.dump(self.results, f, indent=2)
        else:  # txt
            filename = f"api_test_report_{int(time.time())}.txt"
            with open(filename, "w") as f:
                f.write(f"API TEST REPORT - {self.results['timestamp']}\n")
                f.write("=" * 80 + "\n\n")
                
                for idx, test in enumerate(self.results["tests"], 1):
                    f.write(f"TEST #{idx}: {test['method']} {test['endpoint']}\n")
                    f.write("-" * 80 + "\n")
                    f.write(f"Timestamp: {test['timestamp']}\n")
                    f.write(f"Success: {'Yes' if test['success'] else 'No'}\n")
                    
                    if test.get('status_code'):
                        f.write(f"Status Code: {test['status_code']}\n")
                    
                    if test.get('payload'):
                        f.write(f"\nPayload:\n{pformat(test['payload'])}\n")
                    
                    if test.get('response'):
                        f.write(f"\nResponse:\n{pformat(test['response'])}\n")
                    
                    if test.get('notes'):
                        f.write(f"\nNotes: {test['notes']}\n")
                    
                    f.write("\n" + "=" * 80 + "\n\n")
        
        print(f"✅ Reporte generado: {filename}")
        return filename

    def run_all_tests(self):
        print("\n📊 INICIANDO PRUEBAS DE LA API MICRO SAAS 📊\n")
        
        try:
            # Autenticación
            self.register_user()
            self.login()
            self.get_profile()
            
            # Sitios
            self.create_site()
            self.get_sites()
            self.get_site_detail()
            self.update_site()
            
            # Logs y estadísticas
            self.get_logs()
            self.get_stats()
            self.get_user_stats()
            self.get_activity_distribution()
            
            # Pruebas de monitoreo (endpoints en /api/sites/:id/...)
            self.run_site_monitor_check()
            self.run_site_basic_check()
            self.run_site_ssl_check()
            self.run_site_performance_check()
            self.run_site_keyword_check()
            self.run_site_hotspots_check()
            self.get_site_monitor_history()
            
            # Pruebas de monitoreo (endpoints en /api/monitor/...)
            self.update_monitor_settings()
            self.run_monitor_basic_check()
            self.run_monitor_ssl_check()
            self.run_monitor_performance_check()
            self.run_monitor_keywords_check()
            self.run_monitor_hotspots_check()
            self.run_monitor_full_check()
            self.get_monitor_history()
            self.get_admin_monitor_overview()
            
            # Generar reporte
            self.generate_report("json")
            self.generate_report("txt")
            
            print("\n🎉 PRUEBAS COMPLETADAS 🎉")
            
        except Exception as e:
            print(f"\n❌ ERROR DURANTE LAS PRUEBAS: {str(e)}")
            self.add_result("ERROR", "ERROR", None, str(e), False, "Error durante la ejecución de pruebas")
            self.generate_report("json")
            self.generate_report("txt")


if __name__ == "__main__":
    tester = ApiTester()
    tester.run_all_tests()